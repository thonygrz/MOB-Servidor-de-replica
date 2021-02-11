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
    hacerReplica(data);
    fn("Se replicó la información correctamente");
    socket.disconnect();
  });

  socket.on("GLOBAL_ABORT", function (fn) {
    // se desconecta el socket
    fn("Se desconectó el socket correctamente");
    socket.disconnect();
  });

  // socket.on("disconnect", function () {
  //   console.log("Se desconectó el socket correctamente");
  // });
});

http.listen(app.get("port"), () => {
  console.log(`Servidor de réplica corriendo en el puerto ${app.get("port")}`);
  console.log(path.join(__dirname, "public"));
});

function hacerReplica(data) {
  let reg;

  console.log("OBJETOS A HACER REPLICA: ", data);

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
