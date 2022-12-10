import { addDoc, collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
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

    static async getPlayers(roomId: string): Promise<any[]> {
        const querySnapshot = await getDocs(collection(db, `rooms/${roomId}/players`));
        const data: any[] = [];
        querySnapshot.forEach((doc) => {
            // doc.data() is never undefined for query doc snapshots
            data.push({ id: doc.id, ...doc.data() });
        });
        return data;
    }

    // ...
    static async addPlayerToRoom(inviteCode: string, playerName: string): Promise<string> {
        const room = await this.getRoomByInviteCode(inviteCode);

        if (localStorage.getItem('playerId')) {
            // If the player is already in the room don't add again
            const playerDoc = await getDoc(doc(db, `rooms/${room.id}/players/${localStorage.getItem('playerId')}`));
            if (playerDoc.exists()) {
                return playerDoc.id;
            }
        }

        const addedDoc = await addDoc(collection(db, `rooms/${room.id}/players`), {
            name: playerName
        });

        return addedDoc.id;
    }
    // ...
}