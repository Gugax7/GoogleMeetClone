export async function getUserMediaStream(): Promise<MediaStream | null> {
    try{
        return await navigator.mediaDevices.getUserMedia({video:true, audio: true})
    } catch {
        try {
            return await navigator.mediaDevices.getUserMedia({audio: true});
        }
        catch {
            return null;
        }
    }
}

export async function getUserScreenStream(){
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true});
    return screenStream
}