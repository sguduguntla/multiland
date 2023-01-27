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
                    break;
                }
            }
        }

        if (top4Cards.length === 4 && top4Cards[0].rank === top4Cards[1].rank && top4Cards[1].rank === top4Cards[2].rank && top4Cards[2].rank === top4Cards[3].rank) {
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

            // Do not switch turn
            updateDoc(doc(db, `games/${gameId}`), {
                activeDeck: [],
            });
        } else if (lastActiveCard.rank === "7") {
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

    // Need to figure out how to check if face down card is valid or not before adding it to the active deck
    static async updateActiveDeckState(activeDeck: Deck, faceDownDeck: Deck, gameId: string, p1Id: string, p2Id: string) {
        if (activeDeck.size === 0) {
            return;
        }

        await updateDoc(doc(db, `games/${gameId}`), {
            activeDeck: activeDeck.serialize
        });

        await new Promise(resolve => setTimeout(resolve, 2000))

        const oldDeck = new Deck(activeDeck.serialize);
        const oldDeckSerialized = oldDeck.serialize;
        oldDeckSerialized.pop();

        await updateDoc(doc(db, `games/${gameId}`), {
            activeDeck: oldDeckSerialized
        });

        let isValid = false;
        const p2Doc = await getDoc(doc(db, `games/${gameId}/players/${p2Id}`));

        const hand2 = new Hand(p2Doc.data()?.hand);

        const top4Cards = activeDeck.getTopCards(4);
        const topmostCard = top4Cards[top4Cards.length - 1];
        let lastActiveCard = topmostCard;

        if (topmostCard.rank === "9") {
            for (let i = activeDeck.size - 1; i >= 0; i--) {
                if (activeDeck.cards[i].rank !== '9') {
                    lastActiveCard = activeDeck.cards[i];
                    break;
                }
            }
        }

        if (top4Cards.length === 4 && top4Cards[0].rank === top4Cards[1].rank && top4Cards[1].rank === top4Cards[2].rank && top4Cards[2].rank === top4Cards[3].rank) {
            // Do not switch turn
            updateDoc(doc(db, `games/${gameId}`), {
                activeDeck: [],
            });

            isValid = true;
        } else if (lastActiveCard.rank == "2") {
            // Don't switch turn
            updateDoc(doc(db, `games/${gameId}`), {
                activeDeck: activeDeck.serialize
            });

            if (topmostCard.rank === "9") {
                if (faceDownDeck.size > 0) {
                    // Switch turn
                    updateDoc(doc(db, `games/${gameId}`), {
                        playerTurn: p2Id
                    });
                }
            }

            isValid = true;
        } else if (lastActiveCard.rank == "10") {
            // Bomb deck and don't switch turn
            updateDoc(doc(db, `games/${gameId}`), {
                activeDeck: []
            });

            isValid = true;
        } else if (lastActiveCard.rank === "9") { // This means active deck only has only 9s
            for (const card of hand2.cards) {
                card.disabled = false;
            }

            updateDoc(doc(db, `games/${gameId}/players/${p2Id}`), {
                hand: hand2.serialize,
            });

            updateDoc(doc(db, `games/${gameId}`), {
                activeDeck: activeDeck.serialize,
            });

            if (faceDownDeck.size > 0) {
                // Switch turn
                updateDoc(doc(db, `games/${gameId}`), {
                    playerTurn: p2Id
                });
            }
            isValid = true;
        } else {
            if (activeDeck.size === 1) {
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

                    if (faceDownDeck.size > 0) {
                        // Switch turn
                        updateDoc(doc(db, `games/${gameId}`), {
                            activeDeck: activeDeck.serialize,
                            playerTurn: p2Id
                        });
                    }
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

                    if (faceDownDeck.size > 0) {
                        // Switch turn
                        updateDoc(doc(db, `games/${gameId}`), {
                            activeDeck: activeDeck.serialize,
                            playerTurn: p2Id
                        });
                    }
                }

                isValid = true;
            } else {
                const topmostCard = activeDeck?.cards[activeDeck.size - 2];
                let beforeActiveCard = topmostCard;

                if (topmostCard.rank === "9") {
                    for (let i = activeDeck.size - 2; i >= 0; i--) {
                        if (activeDeck.cards[i].rank !== '9') {
                            beforeActiveCard = activeDeck.cards[i];
                            break;
                        }
                    }
                }

                if (RankToValue[lastActiveCard.rank] >= RankToValue[beforeActiveCard.rank]) {
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

                        if (faceDownDeck.size > 0) {
                            // Switch turn
                            updateDoc(doc(db, `games/${gameId}`), {
                                activeDeck: activeDeck.serialize,
                                playerTurn: p2Id
                            });
                        }
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

                        if (faceDownDeck.size > 0) {
                            // Switch turn
                            updateDoc(doc(db, `games/${gameId}`), {
                                activeDeck: activeDeck.serialize,
                                playerTurn: p2Id
                            });
                        }
                    }

                    isValid = true;
                } else {
                    // Invalid card, so take entire active deck into hand again
                    const newHand = new Hand(activeDeck.serialize);
                    for (const card of newHand.cards) {
                        card.disabled = false;
                    }

                    updateDoc(doc(db, `games/${gameId}/players/${p1Id}`), {
                        hand: newHand.serialize
                    });

                    // Switch turn
                    updateDoc(doc(db, `games/${gameId}`), {
                        activeDeck: [],
                        playerTurn: p2Id
                    });

                    isValid = false;
                }

            }

        }

        if (isValid && faceDownDeck.size === 0) {
            // Game is over
            updateDoc(doc(db, `games/${gameId}`), {
                lastWinner: p1Id,
                status: "GAME_OVER"
            });
        }


    }

    // Play turn function
    static async withdrawFromHandToDeck(gameId: string, p1Id: string, p2Id: string, hand: Hand, cards: Card[]) {
        cards.forEach((card) => {
            hand.withdraw(card);
        });

        const gameDoc = await getDoc(doc(db, `games/${gameId}`));

        if (gameDoc.data()?.deck?.length > 0) {
            const deck = new Deck(gameDoc.data()?.deck || []);

            hand.draw(deck, MIN_CARDS_IN_HAND - hand.size);

            updateDoc(doc(db, `games/${gameId}`), {
                deck: deck.serialize,
            });
        } else {
            if (hand.size === 0) {
                // Put face up cards into hand if deck is empty

                const p1Doc = await getDoc(doc(db, `games/${gameId}/players/${p1Id}`));

                if (p1Doc.data()?.faceUp?.length > 0) {
                    const faceUpDeck = new Deck(p1Doc.data()?.faceUp || []);

                    hand.draw(faceUpDeck, faceUpDeck.size);

                    await updateDoc(doc(db, `games/${gameId}/players/${p1Id}`), {
                        faceUp: [],
                    });
                }
            }
        }

        hand.sort();

        const activeDeck = [...(gameDoc.data()?.activeDeck || []), ...cards.map((card) => card.serialize)];

        await this.updateHandState(new Deck(activeDeck), hand, gameId, p1Id, p2Id);
    }

    static async withdrawFaceDownCard(gameId: string, p1Id: string, p2Id: string, faceDownDeck: Deck, card: Card) {
        faceDownDeck.withdraw(card);

        await updateDoc(doc(db, `games/${gameId}/players/${p1Id}`), {
            faceDown: faceDownDeck.serialize,
        });

        const gameDoc = await getDoc(doc(db, `games/${gameId}`));

        const activeDeck = [...(gameDoc.data()?.activeDeck || []), card.serialize];

        this.updateActiveDeckState(new Deck(activeDeck), faceDownDeck, gameId, p1Id, p2Id);
    }

    static async drawFromDeckToHand(gameId: string, p1Id: string, p2Id: string, hand: Hand, numCards: number) {
        const gameDoc = await getDoc(doc(db, `games/${gameId}`));
        const deck = new Deck(gameDoc.data()?.deck || []);

        hand.draw(deck, numCards);

        hand.sort();

        updateDoc(doc(db, `games/${gameId}`), {
            deck: deck.serialize,
        });

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

    static async transferCardsFromActiveDeckToHand(gameId: string, p1Id: string, p2Id: string) {
        const gameDoc = await getDoc(doc(db, `games/${gameId}`));

        const p1Doc = await getDoc(doc(db, `games/${gameId}/players/${p1Id}`));
        const p2Doc = await getDoc(doc(db, `games/${gameId}/players/${p2Id}`));

        const hand1 = new Hand([...(p1Doc?.data()?.hand || []), ...(gameDoc?.data()?.activeDeck || [])]);
        const hand2 = new Hand(p2Doc?.data()?.hand || []);

        hand1.sort();

        for (const card of hand1.cards) {
            card.disabled = false;
        }

        updateDoc(doc(db, `games/${gameId}/players/${p1Id}`), {
            hand: hand1.serialize
        });

        for (const card of hand2.cards) {
            card.disabled = false;
        }

        updateDoc(doc(db, `games/${gameId}/players/${p2Id}`), {
            hand: hand2.serialize
        });

        updateDoc(doc(db, `games/${gameId}`), {
            activeDeck: [],
            playerTurn: p2Id
        });

    }
}