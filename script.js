let token;
let jsonBlob;
let mostRecentPost = "None";
let mostRecentPoster = "None";
let mostRecentPostOrigin = "None";
let mostRecentPostID = "None";
let cloudlink;

let username = ""
let password = ""

const imageCmds = {
  "mew": "https://uploads.meower.org/attachments/rt1ESZLHIYUhwDaT51eBVd4t/mewing.png",
  "flooshed": "https://uploads.meower.org/attachments/yn2ezrmhAo87ItbeqJarqnTQ/download_(8).jpeg"
}

function connectToWebSocket() {
  cloudlink = new WebSocket("wss://server.meower.org");
  cloudlink.onmessage = onMessage;
  cloudlink.onopen = () => console.log("WebSocket connection opened.");
  cloudlink.onerror = (error) => console.error("WebSocket error:", error);
  return new Promise((resolve, reject) => {
    cloudlink.addEventListener("open", () => { resolve()
    })
  })
}

function login(username, password) {
  //console.log("log", username, password)
  const authPacket = {
    cmd: "direct",
    val: {
      cmd: "authpswd",
      val: { username: username, pswd: password }
    }
  };
  cloudlink.send(JSON.stringify(authPacket));
  return new Promise((resolve, reject) => {
    cloudlink.addEventListener("message", (event) => {
      if (JSON.parse(event.data).val == "I:100 | OK") {resolve()}
    })
  })
}

function getChat(channel){
  return fetch(`https://api.meower.org/${channel}`, {
    method: 'GET',
    headers: {
      'Token': token
    }
  }).then(response => {
    if (!response.ok){
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
}

async function getDM(sender){
    if (!dmID[sender]){
      dmID[sender] = (await getChat(`users/${sender}/dm`))["_id"];
    }
    return dmID[sender]
}

function sendMessage(message, channel, attach) {
  console.log(message, channel);
  let url = 'https://api.meower.org/home';
  if (channel !== 'home') {
    url = `https://api.meower.org/posts/${channel}`;
  }

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Token': token
    },
    body: JSON.stringify({
      content: message,
      attachments: [`${attach}`]
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
  .then(data => {
    console.log('Message sent successfully:', data);
    return data
  })
  .catch(error => {
    console.error('There was a problem sending the message:', error);
    console.log(error);
  });
}

function editMessage(id, newPost){
  console.log(id);
  fetch(`https://api.meower.org/posts?id=${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Token': token
    },
    body: JSON.stringify({
      content: newPost,
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
}

function deletePost(id){
  fetch(`https://api.meower.org/posts?id=${id}`, {
    method: 'DELETE',
    headers: {
      'Token': token
    }
  }).then((response) => {
    if (!response.ok) {
      console.error("Problem getting message:", response.status);
    } else {
      console.log("Post deleted");
    }
  })
}

function onMessage(event) {
  const packet = JSON.parse(event.data);
  handleIncomingPacket(packet); 
  console.log("Received packet:", packet.val, packet);
  if (packet.val.payload && packet.val.payload.token) { 
    token = packet.val.payload.token;
    console.log("Token:", token);
  } else {
    console.log("Token not found in the received packet.");
  }
}

function uploadImage(blob){
  const form = new FormData();
  form.set("file", blob);
  return fetch("https://uploads.meower.org/attachments", {
    method: "POST",
    headers: {
      'Authorization': token
    },
    body: form
  }).then(response => {
   if (!response.ok) {
     throw new Error('Network response was not ok');
   }
   return response.json();
 })
}

async function onPing(sender, channel, id, text){
  console.info(`Received message ${text} from ${sender} in ${channel} with id ${id}`);
  if (!text.startsWith("!")) {return;}
  text = text.slice(1);
  text = text.toLowerCase().split(" ");
  console.info(text);
  if (text[0] == "mewing"){
    editMessage(id, "🤫🧏", "");
  } else if (text[0] in imageCmds){
    deletePost(id);
    sendMessage("", channel, (await uploadImage(await (await fetch(imageCmds[text[0]])).blob())).id);
  } //else if (text[0] == "bl" || text[0] == "blacklist" || text[0] == "block"){
    
  //}
}

function handleIncomingPacket(packet) {
  if (packet.val.t) {
    if (packet.val.u === "Discord") {
      const parts = packet.val.p.split(": ");
      if (parts.length === 2) {
        mostRecentPost = parts[1].trim();
        mostRecentPoster = parts[0].trim();
      }
    } else {
      mostRecentPost = packet.val.p;
      mostRecentPoster = packet.val.u;
    }
    mostRecentPostOrigin = packet.val.post_origin;
    mostRecentPostID = packet.val.post_id;
    if (packet.val.u.toLowerCase().includes(`${username.toLowerCase()}`)) {
      onPing(packet.val.u, packet.val.post_origin, packet.val._id, packet.val.p);
    }
  }
}

async function run(){
  await connectToWebSocket();
  await login(username, password);
  //sendMessage("Hello, world!", "home", (await uploadImage(await (await fetch("https://uploads.meower.org/attachments/AEimkosly0L0FmxVGrhZessK/download_(8).jpeg")).blob())).id);
}

//run()

function processInput(){
  username = document.getElementById('myInput').value;
  password = document.getElementById('myInput2').value;
  document.getElementById('myInput').style.display = 'none';
  document.getElementById('myInput2').style.display = 'none';
  document.getElementById('inputButton').style.display = 'none';
  document.getElementById('text1').style.display = 'none';
  document.getElementById('text2').style.display = 'none';
  run();
}
