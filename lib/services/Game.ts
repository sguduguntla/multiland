import { addDoc, collection, doc, getDoc, Timestamp } from 'firebase/firestore';
import db from "../firebase";

export class GameService {
    private static gamesRef = collection(db, "games");

    static async createGame(roomId: string, type: string): Promise<any> {
        const gameDocRef = await addDoc(this.gamesRef, {
            deck: [],
            activeDeck: [],
            type,
            createdAt: Timestamp.now(),
            room: doc(db, `rooms/${roomId}`)
        });

        const gameDoc = await getDoc(gameDocRef);
        const game = { id: gameDoc.id, ...gameDoc.data() };
        return game;
    }
}