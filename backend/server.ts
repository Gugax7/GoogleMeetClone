import app from './src/app';
import { Server } from 'socket.io'

const PORT = process.env.PORT || 3000;

app.get("/health", (req,res) => {
    res.status(200).json({status: "Everything is fine"})
})

const server = app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
})

const io = new Server(server, {
    cors: {
        origin: "*"
    }
})

io.on('connection', (socket) => {
    socket.on('join-room', (room) => {
        socket.join(room);
        socket.to(room).emit('user-connected', socket.id);
        console.log(`user: ${socket.id} connected to ${room}`)

        socket.on('frame', (frame) => {
            socket.to(room).emit('partner-frame', frame)
        })

        socket.on('offer', ({offer, to}) => {
            socket.to(to).emit('offer', {offer, from: socket.id});
        })
        
        socket.on('answer', ({answer, to}) => {
            socket.to(to).emit('answer', {answer, from: socket.id});
        })

        socket.on('ice-candidate', ({iceCandidate, to}) => {
            socket.to(to).emit('ice-candidate', {iceCandidate, from: socket.id});
        })

        socket.on("disconnect", () => {
            socket.to(room).emit('user-disconnect', socket.id);
        })

        socket.on('peer-track', (data) => {
            socket.to(room).emit('peer-track', { ...data, from: socket.id });
        })

        socket.on('peer-stop-screen-share', () => {
            socket.to(room).emit('peer-stop-screen-share', socket.id);
        })
    })
})