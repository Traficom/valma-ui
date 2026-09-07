 module.exports = {
    parseLogEvent: function (event, defaultLevel) {
    let messageObject;
      try {
        const json = JSON.parse(event);
        messageObject = {
          ...json,
          time: new Date()
        }
      } catch (e) {
        messageObject = {
          source: 'stderr',
          level: defaultLevel,
          message: event,
          time: new Date()
        }
      }
      return messageObject;
  }
}