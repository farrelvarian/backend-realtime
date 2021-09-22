require("dotenv").config();
const express = require("express");
const socket = require("socket.io");
const http = require("http");
const cors = require("cors");
const morgan = require("morgan");
// const bodyParser = require("body-parser");
const userRouter = require("./src/routes/users");
const userAuthRouter = require("./src/routes/userAuth");
const messageRouter = require("./src/routes/messages");
const jwt = require("jsonwebtoken");
const app = express();
const httpServer = http.createServer(app);
const moment = require("moment");
moment.locale("id");
const messagesModels = require("./src/models/messages");
const usersModels = require("./src/models/users");
// use middle
app.use(cors());
app.use((_, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  ); // If needed
  res.header(
    "Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization"
  ); // If needed
  res.header("Access-Control-Allow-Credentials", true); // If needed
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan("dev"));

app.use("/messages", messageRouter);
app.use("/users", userRouter);
app.use("/auth", userAuthRouter);
app.use("/files", express.static("./uploads"));

app.get("/", (req, res) => {
  res.json({ message: "success" });
});

// config socket
const io = socket(httpServer, {
  cors: {
    origin: "*",
  },
});

//auth socket
io.use((socket, next) => {
  const token = socket.handshake.query.token;

  // verify token
  jwt.verify(token, process.env.SECRET_KEY, function (err, decoded) {
    if (err) {
      if (err.name === "TokenExpiredError") {
        const error = new Error("token expired");
        error.status = 401;
        return next(error);
      } else if (err.name === "JsonWebTokenError") {
        const error = new Error("token invalid");
        error.status = 401;
        return next(error);
      } else {
        const error = new Error("token not active");
        error.status = 401;
        return next(error);
      }
    }
    socket.userId = decoded.id;
    socket.userName = decoded.name;
    socket.join(decoded.id);
    next();
  });
});

// use socket
io.on("connection", (socket) => {
  const idsocket = { socket_id: socket.id };
  usersModels.updateUser(socket.userId, idsocket).then(() => {
    console.log("success");
  });
  console.log("ada client yg terhubung", socket.userName);

  socket.on("sendMessage", ({ idReceiver, messageBody }, callback) => {
    const dataMessage = {
      sender_name:socket.userName,
      sender_id: socket.userId,
      receiver_id: idReceiver,
      message: messageBody,
      createdAt: new Date(),
    };
    console.log(socket.userId);
    callback({
      ...dataMessage,
      createdAt: moment(dataMessage.created_at).format("LT"),
    });
    // simpan ke db
    
    messagesModels.insertMessage(dataMessage).then(() => {
      console.log("success");
      socket.broadcast.to(idReceiver).emit("msgFromBackend", {
        ...dataMessage,
        createdAt: moment(dataMessage.createdAt).format("LT"),
      });
    });
  });
  socket.on("disconnect", () => {
    const idsocket = { socket_id: `-` };
    // socket.broadcast.to(idReceiver).emit("msgFromBackend", {})

    usersModels.updateUser(socket.userId, idsocket).then(() => {
      console.log("success");
    });
    console.log("ada perangkat yang terputus ", socket.userName);
  });
});

app.use("*", (req, res, next) => {
  const error = new createError.NotFound();
  next(error);
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "internal server Error",
  });
});

app.listen(process.env.PORT, () => {
  console.log(`server is running on port ${process.env.PORT}`);
});
