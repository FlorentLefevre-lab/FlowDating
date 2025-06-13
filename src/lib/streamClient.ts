import { StreamChat } from 'stream-chat'

let streamClient: StreamChat | null = null

export const getClientStreamChat = () => {
  if (!streamClient) {
    streamClient = StreamChat.getInstance(process.env.NEXT_PUBLIC_STREAM_API_KEY!)
  }
  return streamClient
}