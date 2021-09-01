const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const messageController = require("../controllers/messages");

router.get("/:idReceiver", auth.verifyAccess, messageController.getMessageById);

module.exports = router;
