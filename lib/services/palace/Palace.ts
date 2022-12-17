import { arrayUnion, doc, getDoc, updateDoc } from "firebase/firestore";
import db from "../../firebase";
import { Card } from "../../models/Card";
import { Deck } from "../../models/Deck";
import { Hand } from "../../models/Hand";
import { GameService } from "../Game";
import { RankToValue } from './../../models/Card';

export const INIT_CARDS_PER_PLAYER = 6;
export const INIT_FACE_DOWN_CARDS_PER_PLAYER = 3;
export const MIN_CARDS_IN_HAND = 3;
export const SPECIAL_ANYTIME_CARDS = ["10", "2", "9"]; // Special cards that can be put down any time

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
                faceDown: faceDownHands[i]?.serialize,
                faceUp: [],
                chosenFaceUp: false
            });
            i++;
        }

        updateDoc(doc(db, `games/${gameId}`), {
            deck: this.deck.serialize,
            activeDeck: []
        });
    }

    static async updateHandState(activeDeck: Deck, hand1: Hand, gameId: string, p1Id: string, p2Id: string) {
        if (activeDeck.size === 0) {
            return;
        }

        const p2Doc = await getDoc(doc(db, `games/${gameId}/players/${p2Id}`));

        const hand2 = new Hand(p2Doc.data()?.hand);

        const top4Cards = activeDeck.getTopCards(4);
        const topmostCard = top4Cards[top4Cards.length - 1];
        let lastActiveCard = topmostCard;

        if (topmostCard.rank === "9") {
            for (let i = activeDeck.size - 1; i >= 0; i--) {
                if (activeDeck.cards[i].rank !== '9') {
                    lastActiveCard = activeDeck.cards[i];
                }
            }
        }

        if (lastActiveCard.rank === "7") {
            for (const card of hand2.cards) {
                if (!SPECIAL_ANYTIME_CARDS.includes(card.rank) && RankToValue[card.rank] > RankToValue["7"]) {
                    card.disabled = true;
                } else {
                    card.disabled = false;
                }
            }

            updateDoc(doc(db, `games/${gameId}/players/${p2Id}`), {
                hand: hand2.serialize,
            });

            for (const card of hand1.cards) {
                card.disabled = false;
            }

            await updateDoc(doc(db, `games/${gameId}/players/${p1Id}`), {
                hand: hand1.serialize,
            });

            // Switch turn
            updateDoc(doc(db, `games/${gameId}`), {
                activeDeck: activeDeck.serialize,
                playerTurn: p2Id
            });
        } else if (lastActiveCard.rank == "2") {
            for (const card of hand1.cards) {
                card.disabled = false;
            }

            updateDoc(doc(db, `games/${gameId}/players/${p1Id}`), {
                hand: hand1.serialize,
            });

            // Don't switch turn
            updateDoc(doc(db, `games/${gameId}`), {
                activeDeck: activeDeck.serialize
            });
        } else if (lastActiveCard.rank == "10") {
            for (const card of hand1.cards) {
                card.disabled = false;
            }

            updateDoc(doc(db, `games/${gameId}/players/${p1Id}`), {
                hand: hand1.serialize,
            });

            // Bomb deck and don't switch turn
            updateDoc(doc(db, `games/${gameId}`), {
                activeDeck: []
            });
        } else if (lastActiveCard.rank === "9") { // This means active deck only has one 9
            for (const card of hand2.cards) {
                card.disabled = false;
            }

            updateDoc(doc(db, `games/${gameId}/players/${p2Id}`), {
                hand: hand2.serialize,
            });

            for (const card of hand1.cards) {
                card.disabled = false;
            }

            await updateDoc(doc(db, `games/${gameId}/players/${p1Id}`), {
                hand: hand1.serialize,
            });

            // Switch turn
            updateDoc(doc(db, `games/${gameId}`), {
                activeDeck: activeDeck.serialize,
                playerTurn: p2Id
            });
        } else {
            for (const card of hand2.cards) {
                if (!SPECIAL_ANYTIME_CARDS.includes(card.rank) && RankToValue[card.rank] < RankToValue[lastActiveCard.rank]) {
                    card.disabled = true;
                } else {
                    card.disabled = false;
                }
            }

            updateDoc(doc(db, `games/${gameId}/players/${p2Id}`), {
                hand: hand2.serialize,
            });

            for (const card of hand1.cards) {
                card.disabled = false;
            }

            await updateDoc(doc(db, `games/${gameId}/players/${p1Id}`), {
                hand: hand1.serialize,
            });

            // Switch turn
            updateDoc(doc(db, `games/${gameId}`), {
                activeDeck: activeDeck.serialize,
                playerTurn: p2Id
            });

        }

    }

    // Play turn function
    static async withdrawFromHandToDeck(gameId: string, p1Id: string, p2Id: string, hand: Hand, cards: Card[]) {
        cards.forEach((card) => {
            hand.withdraw(card);
        });

        hand.draw(this.deck, MIN_CARDS_IN_HAND - hand.size);
        hand.sort();

        const gameDoc = await getDoc(doc(db, `games/${gameId}`));
        const activeDeck = [...(gameDoc.data()?.activeDeck || []), ...cards.map((card) => card.serialize)];

        await this.updateHandState(new Deck(activeDeck), hand, gameId, p1Id, p2Id);
    }

    static async drawFromDeckToHand(gameId: string, p1Id: string, p2Id: string, hand: Hand, numCards: number) {
        hand.draw(this.deck, numCards);

        hand.sort();

        updateDoc(doc(db, `games/${gameId}`), {
            deck: this.deck.serialize,
        });

        const gameDoc = await getDoc(doc(db, `games/${gameId}`));

        this.updateHandState(new Deck(gameDoc.data()?.activeDeck || []), hand, gameId, p1Id, p2Id);
    }

    static async selectFaceCards(gameId: string, playerId: string, hand: Hand, cards: Card[]) {
        cards.forEach((card) => {
            hand.withdraw(card);
        });

        hand.sort();

        const playerDoc = await getDoc(doc(db, `games/${gameId}/players/${playerId}`));
        let chosenFaceUp = false;
        if (playerDoc.data()?.faceUp.length + cards.length >= INIT_FACE_DOWN_CARDS_PER_PLAYER) {
            chosenFaceUp = true;
        }

        updateDoc(doc(db, `games/${gameId}/players/${playerId}`), {
            hand: hand.serialize,
            faceUp: arrayUnion(...cards.map((card) => card.serialize)),
            chosenFaceUp
        });

        if (chosenFaceUp) {
            // Start the game and choose first player
            await this.startGameAndChooseFirstPlayer(gameId);
        }
    }

    static async startGameAndChooseFirstPlayer(gameId: string) {
        const players = await GameService.getPlayers(gameId);
        for (const p of players) {
            let allChosenFaceUp = true;
            if (!p.chosenFaceUp) {
                allChosenFaceUp = false;
                break;
            }

            if (allChosenFaceUp) {
                const gameDoc = await getDoc(doc(db, `games/${gameId}`));
                let playerTurn = "";
                if (gameDoc.data()?.lastWinner) {
                    // Prioritize the first player to be the person who won the previous game
                    playerTurn = gameDoc.data()?.lastWinner;
                } else {
                    const playerIds = players.map(p => p.id);
                    playerTurn = playerIds[Math.floor(Math.random() * playerIds.length)];
                }
                // Randomly chooses the first player to play
                updateDoc(doc(db, `games/${gameId}`), {
                    playerTurn
                });
            }

            return allChosenFaceUp;
        }
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