import express from "express";
import morgan from "morgan";
import cors from "cors";
import path from "path";
import router from "./routes";
import dotenv from "dotenv";
const fs = require("fs");
import parser from "xml2json";

dotenv.config();
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);

app.use(morgan("dev"));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use("/api", router);
app.set("port", process.env.PORT || 3000);

let dato;

function getDato() {
  return dato;
}

function setDato(res) {
  dato = res;
}

//Conexion inicial con socket
io.on("connection", function (socket) {
  console.log(
    "Usuario conectado al servidor de réplica",
    socket.handshake.address
  );

  // Respuesta ante VOTE_REQUEST 
  socket.on("VOTE_REQUEST", function (data, fn) {
    if (data === "COMMIT") fn("VOTE_COMMIT");
    else if (data === "ABORT") fn("VOTE_ABORT");
  });

  //Respuesta y replica ante un GLOBAL_COMMIT con resultado satisfactorio y desconexion del socket
  socket.on("GLOBAL_COMMIT", function (data, fn) {
    //Se replica
    hacerReplica(data);
    fn("Se replicó la información correctamente");
    socket.disconnect();
  });

  //Respuesta ante un GLOBAL_REPORT con resultado satisfactorio y desconexion del socket
  socket.on("GLOBAL_ABORT", function (fn) {
    fn("Se abortó la réplica");
    //Se desconecta el socket
    socket.disconnect();
  });

  //Respuesta para la restauracion de objetos el cual manda toda la base de datos al servidor de aplicacion
  socket.on("recibirObjetos", function (fn) {
    console.log("dentro de restaurarObjetos");

     //Lecutra de base de datos para restauracion 
    fs.readFile(process.env.DATABASE_URL, function (err, data) {
      let xml_file = JSON.parse(parser.toJson(data, { reversible: true }))
        .objetos.objeto;
      setDato(xml_file);
    });

    //Espera por la lectura del archivo XML 
    setTimeout(() => {
      console.log("getDato: ", getDato());
      fn(getDato());
      
      //Se desconecta el socket
      socket.disconnect();
    }, 3000);

  });
});

//Instanciacion del servidor con la ip local (VPN)
http.listen(app.get("port"), () => {
  console.log(`Servidor de réplica corriendo en el puerto ${app.get("port")}`);
  console.log(path.join(__dirname, "public"));
});

//Funcion principal para la replica de los datos en el servidor
function hacerReplica(data) {
  let reg;

  console.log("OBJETOS A HACER REPLICA: ", data);

  //Escritura de replica a la base de datos en XML
  reg = parser.toXml(
    {
      objetos: {
        objeto: data,
      },
    },
    { reversible: true }
  );
  fs.writeFile(process.env.DATABASE_URL, reg, () => {});
}
