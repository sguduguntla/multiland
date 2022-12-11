import { addDoc, collection, doc, getDoc, getDocs, Timestamp } from 'firebase/firestore';
import db from "../firebase";
import { RoomService } from './Room';

export class GameService {
    private static gamesRef = collection(db, "games");

    static async createGame(roomId: string, type: string): Promise<any> {
        const players = await RoomService.getPlayers(roomId);

        const gameDocRef = await addDoc(this.gamesRef, {
            deck: [],
            activeDeck: [],
            type,
            createdAt: Timestamp.now(),
            room: doc(db, `rooms/${roomId}`),
        });

        const gameDoc = await getDoc(gameDocRef);
        const game = { id: gameDoc.id, ...gameDoc.data() };

        for (const player of players) {
            addDoc(collection(db, `games/${game.id}/players`), {
                name: player.name,
                hand: [],
                faceDown: [],
                faceUp: [],
            });
        }
        return game;
    }

    static async getPlayers(gameId: string): Promise<any[]> {
        const querySnapshot = await getDocs(collection(db, `games/${gameId}/players`));
        const data: any[] = [];
        querySnapshot.forEach((doc) => {
            // doc.data() is never undefined for query doc snapshots
            data.push({ id: doc.id, ...doc.data() });
        });
        return data;
    }

    static async updatePlayers(gameId: string,): Promise<any[]> {
        const querySnapshot = await getDocs(collection(db, `games/${gameId}/players`));
        const data: any[] = [];
        querySnapshot.forEach((doc) => {
            // doc.data() is never undefined for query doc snapshots
            data.push({ id: doc.id, ...doc.data() });
        });
        return data;
    }

}