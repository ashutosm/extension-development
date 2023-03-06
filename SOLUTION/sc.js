const kk=(message,number)=>{return{
    text: message,
    recipients: [{
        type: "phone",
        id: '91'+number,
        entity: {
            name: '91'+number
        },
        message: 'hello'
    }]
}};
function sendMessage(task){
    window.dispatchEvent(
        new CustomEvent("pws::incoming-task", {
          detail: {
            task: task,
          },
        })
      );
}
sendMessage(kk('how are you','9999999999'));