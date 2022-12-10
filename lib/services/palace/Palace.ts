import { arrayUnion, doc, updateDoc } from "firebase/firestore";
import db from "../../firebase";
import { Card } from "../../models/Card";
import { Deck } from "../../models/Deck";
import { Hand } from "../../models/Hand";
import { GameService } from "../Game";

const INIT_CARDS_PER_PLAYER = 6;
const INIT_FACE_DOWN_CARDS_PER_PLAYER = 3;
const MIN_CARDS_IN_HAND = 3;

export class Palace {
    private static deck: Deck;

    static async init(gameId: string) {
        const players = await GameService.getPlayers(gameId);

        this.deck = new Deck(); // Generates a random deck of cards

        const activeHands = this.deck.deal(players.length, INIT_CARDS_PER_PLAYER, true); // Deals the cards to the players
        console.log("HANDS", activeHands);
        const faceDownHands = this.deck.deal(players.length, INIT_FACE_DOWN_CARDS_PER_PLAYER); // Deals the facedown cards to the players
        console.log("FACEDOWN", faceDownHands);

        let i = 0;
        for (const p of players) {
            updateDoc(doc(db, `games/${gameId}/players/${p.id}`), {
                hand: activeHands[i]?.serialize,
                faceDown: faceDownHands[i]?.serialize
            });
            i++;
        }

        updateDoc(doc(db, `games/${gameId}`), {
            deck: this.deck.serialize,
            activeDeck: []
        });
    }

    static async withdrawFromHandToDeck(gameId: string, playerId: string, hand: Hand, cards: Card[]) {
        cards.forEach((card) => {
            hand.withdraw(card);
        });

        hand.draw(this.deck, MIN_CARDS_IN_HAND - hand.size);
        hand.sort();

        updateDoc(doc(db, `games/${gameId}/players/${playerId}`), {
            hand: hand.serialize,
        });

        updateDoc(doc(db, `games/${gameId}`), {
            activeDeck: arrayUnion(...cards.map((card) => card.serialize)),
        });
    }

    static async canPlayCard(activeDeck: Deck, card: Card) {
        const top4Cards = activeDeck.getTopCards(4); // last one is topmost card (bottom to top order)

        if (top4Cards.length === 0) {
            return true;
        }

        const topCard = top4Cards[top4Cards.length - 1];

        if (topCard.suit === card.suit) {
            return false;
        }


    }
}