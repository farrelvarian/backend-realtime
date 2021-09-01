const messagesModels = require("../models/messages");
const helpers = require("../helpers/helpers");
const getMessageById = (req, res) => {
  const idReceiver = req.params.idReceiver;
  const idSender = req.idUser;
  messagesModels
    .getMessageById(idSender, idReceiver)
    .then((result) => {
      helpers.response(res, "success get messages", result, 200);
    })
    .catch((err) => {
       helpers.response(res, "failed get messages", null, 401);
    });
};

module.exports = {
  getMessageById,
};
