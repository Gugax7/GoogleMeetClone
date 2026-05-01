import app from './src/app';
import { Server } from 'socket.io'

const PORT = process.env.PORT || 3000;

app.get("/health", (req,res) => {
    res.status(200).json({status: "Everything is fine"})
})

const server = app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
})

const io = new Server(server, {});

io.on('connection', (socket) => {
    socket.on('join-room', (room) => {
        socket.join(room);
        socket.to(room).emit('user-connected', socket.id);
    })
})