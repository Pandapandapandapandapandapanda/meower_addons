let token;
let jsonBlob;
let mostRecentPost = "None";
let mostRecentPoster = "None";
let mostRecentPostOrigin = "None";
let mostRecentPostID = "None";
let loginPacket = "None";
let groupChats = [];
let cloudlink;

let username = ""
let password = ""
let dmID = {};
let botRep = {};
let textRep = {
  "cat": "car",
  "car": "cat"
};
let blockText = [];
let saveChat;
//let joke = false;

const imageCmds = {
  "bru": "https://uploads.meower.org/attachments/KLwTUjxNu08733AwrtAaxHbx/bru.jpg",
  "flooshed": "https://uploads.meower.org/attachments/OeaSRmBw9ibAQwYOlsDVjBJ0/3x.png",
  "meow": "https://uploads.meower.org/attachments/dbvbVvD9u9e5PRq04mglyZ26/SPOILER_2024-04-22_13-18-30_2.png",
  "gay": "https://uploads.meower.org/attachments/YO9oAICa6YD810L4RasBxh18/boykisser.jpg",
  "sigma": "https://uploads.meower.org/attachments/fE0On3UAkXF4Tzkvy6MLak3b/240A5691A22C4F9DBAE4.gif",
  "mybearhell": "https://uploads.meower.org/attachments/qw4AFd4VNuLc8xFkkQBc6Vk0/whatinthe.png"
};
const fq = ["https://uploads.meower.org/attachments/YlqBYCi7dUWBWt1ptE7eDyfh/FDA44EEFDF7B47FEA69D.png", "https://uploads.meower.org/attachments/eLa9qNgGMUMxw0WJ9oQNXY5I/BAD0C42C0E924A449495.gif", "https://uploads.meower.org/attachments/IK1jcbjGl9KsAk9k18tN7da9/24C7CE2B91DC40E992B5.gif", "https://uploads.meower.org/attachments/mgYAri94LzypbqW1b9aMqCUO/A372E9321EF1414BACA8.gif", "https://uploads.meower.org/attachments/0Wmh24Nab2b4ZwHWE6GSMbao/F063A19FAF8744D9898B.gif", "https://uploads.meower.org/attachments/ER5omyr4AUa4MZohljat2Z44/6801838A7E4646B6AA14.gif", "https://uploads.meower.org/attachments/HFcFgbkHBbmhlM3k3HxK50lZ/79E9ADF2642F4846804D.gif", "https://uploads.meower.org/attachments/HSLxjMfbWBwcQwSeA4zAiOqx/C8A86854B17B483994CD.gif", "https://uploads.meower.org/attachments/xiJLP5r8g6IZn9XgbMqMffnq/DDF1A5A4A9074731B653.gif"];
const commands = "test";

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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

function createChat(nickname) {
    return fetch("https://api.meower.org/chats", {
        method: "POST",
        headers: {
            token: token,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ nickname })
    })
    .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    })
}

function getGroupChats(id){
  return fetch(`https://api.meower.org/chats?autoget=${id}`, {
    method: "GET",
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

async function getSave(){
  let gc = (await getGroupChats()).autoget;
  console.log(gc);
  for (let item of gc){
    if (item.nickname){
      groupChats.push(item);
      if (item.nickname == "addonSaves"){
        saveChat = item;
      }
    }
  }
  if (saveChat){
    console.log(saveChat);
    let save = await getGroupChats(`${saveChat._id}`);
    console.log(save);
  } else {
    let saveChat = await createChat("addonSaves");
    console.log(saveChat);
  }
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
  if (channel != 'home') {
    url = `https://api.meower.org/posts/${channel}`;
  }
  console.log(url);
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Token': token
    },
    body: JSON.stringify({
      content: message,
      attachments: attach? [`${attach}`] : []
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

function block(user, state){
  fetch(`https://api.meower.org/users/${user}/relationship`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Token": token
    },
    body: JSON.stringify({
      "state": state
    })
  })
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
    loginPacket = packet;
    console.log("Token:", token);
    //console.info("Login: ", loginPacket);
    getSave();
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

async function botReplace(bot, message, channel){
  console.log(bot, botRep[bot], message, channel);
  await wait(100);
  sendMessage(`@${botRep[bot]} ${message}`, channel, "");
}

function textReplace(text, id){
  for (const value in textRep){
    let regex = new RegExp(value, "gi");
    text = text.replace(regex, textRep[value])
  }
  editMessage(id, `${text}`);
}

async function onPing(sender, channel, id, text){
  console.info(`Received message ${text} from ${sender} in ${channel} with id ${id}`);
  if (botRep[text.charAt(0)]) {botReplace(text.charAt(0), text.slice(1), channel); deletePost(id); return;}
  if (!text.startsWith("!")) {textReplace(text, id); return;}
  text = text.slice(1);
  text = text.toLowerCase().split(" ");
  console.info(text);
  if (text[0] == "mewing"){
    editMessage(id, "MEWING IS BAD!!!", "");
  } else if (text[0] in imageCmds){
    deletePost(id);
    sendMessage("", channel, (await uploadImage(await (await fetch(imageCmds[text[0]])).blob())).id);
  } else if (text[0] == "bl" || text[0] == "blacklist" || text[0] == "block"){
    deletePost(id);
    block(text[1], 2);
  } else if (text[0] == "ub" || text[0] == "unblacklist" || text[0] == "unblock"){
    deletePost(id);
    block(text[1], 0);
  } else if (text[0] == "cb" || text[0] == "changestate"){
    deletePost(id);
    block(text[1], text[2]);
  } else if (text[0] == "help" || text[0] == "commands"){
    //console.log("!!!", await getDM("gc"));
    sendMessage(commands, await getDM(username), "");
    deletePost(id);
  } else if (text[0] == "setbot" || text[0] == "sb"){
    if (!botRep[text[2]]){
      botRep[text[2]] = text[1];
    }
    deletePost(id);
  } else if (text[0] == "femquote" || text[0] == "fq" || text[0] == "femboyquote"){
    deletePost(id);
    sendMessage("", channel, (await uploadImage(await (await fetch(fq[Math.floor(Math.random()*fq.length)])).blob())).id);
  } else if (text[0] == "rembot" || text[0] == "rb"){
    delete botRep[text[2]];
    deletePost(id);
  } else if (text[0] == "textreplace" || text[0] == "tr"){
    if (!textRep[text[1]]){
      textRep[text[1]] = text[2];
    }
    deletePost(id);
  } else if (text[0] == "rtr" || text[0] == "remtextreplace"){
    delete textRep[text[1]];
    deletePost(id);
  } else if (text[0] == "cleartr"){
    textRep = {};
    deletePost(id);
  } else if (text[0] == "clearbot"){
    botRep = {};
    deletePost(id);
  } else if (text[0] == "blocktext" || text[0] == "bt"){
    blockText.push(text[1]);
    deletePost(id);
  } else if (text[0] == "remblocktext" || text[0] == "rbt"){
    blockText.splice(blockText.indexOf(text[1]), 1);
    deletePost(id);
  } else if (text[0] == "clearblocktext" || text[0] == "cbc"){
    blockText = [];
    deletePost(id);
  }// else if (text[0] == "ej"){
   // joke = !joke;
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
    } else if (blockText.includes(packet.val.p)){
      block(packet.val.u, 2)
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
