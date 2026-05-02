import {io} from "socket.io-client";

const socket = io("http://localhost:3000");

socket.on('user-connected', (id) => {
    console.log("user connected: ", id)
})

socket.emit("join-room", "room-001");
