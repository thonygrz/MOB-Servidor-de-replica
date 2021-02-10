import express from "express";
import morgan from "morgan";
import cors from "cors";
import path from "path";
import router from "./routes";
import dotenv from "dotenv";
import fs from "fs";
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

io.on("connection", function (socket) {
  console.log(
    "Usuario conectado al servidor de réplica",
    socket.handshake.address
  );

  // vote_request
  socket.on("VOTE_REQUEST", function (data, fn) {
    if (data === "COMMIT") fn("VOTE_COMMIT");
    else if (data === "ABORT") fn("VOTE_ABORT");
  });

  socket.on("GLOBAL_COMMIT", function (data, fn) {
    // se replica
    fn("Replica satisfactoria de la data: ", data);
  });

  // replicar
  socket.on("disconnect", function () {
    console.log("A user disconnected");
  });
});

http.listen(app.get("port"), () => {
  console.log(`Servidor de réplica corriendo en el puerto ${app.get("port")}`);
  console.log(path.join(__dirname, "public"));
});

function hacerReplica(data) {
  let reg = [];
  fs.readFile(process.env.DATABASE_URL, function (err, data) {
    reg = JSON.parse(parser.toJson(data, { reversible: true }));
    console.log("reg: ", reg);
    if (reg.objetos && reg.objetos.objeto[1]) {
      reg.objetos.objeto.push(data);
    } else {
      if (reg.objetos && reg.objetos.objeto) {
        reg = {
          objetos: {
            objeto: [
              {
                nombre: reg.objetos.objeto.nombre,
                fecha: reg.objetos.objeto.fecha,
                accion: reg.objetos.objeto.accion,
              },
              data,
            ],
          },
        };
      } else {
        reg = {
          objetos: {
            objeto: [data],
          },
        };
      }
    }
    reg = parser.toXml(reg, { reversible: true });
    fs.writeFile(process.env.DATABASE_URL, reg, () => {});
  });
}
