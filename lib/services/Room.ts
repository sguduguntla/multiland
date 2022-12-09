import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
import db from "../firebase";

export class RoomService {
    private static roomsRef = collection(db, "rooms");

    static async getRoomByInviteCode(inviteCode: string): Promise<any> {
        const q = await getDocs(query(this.roomsRef, where("inviteCode", "==", inviteCode)));
        if (q.empty) {
            throw new Error("Room not found");
        }

        const room = { id: q.docs[0].id, ...q.docs[0].data() };

        return room;
    }

    // ...
    static async addPlayerToRoom(inviteCode: string, playerName: string): Promise<void> {
        const room = await this.getRoomByInviteCode(inviteCode);

        await addDoc(collection(db, `rooms/${room.id}/players`), {
            name: playerName
        });
    }
    // ...
}