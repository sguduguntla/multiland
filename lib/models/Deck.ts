import _ from 'lodash';
import { Card, CardRank, CardSerial, CardSuit } from "./Card";
import { Hand } from './Hand';

export class Deck {
    private _cards: Card[] = [];

    constructor(...args: any[]) {
        if (args.length === 1) {
            const serializedCards = args[0] as CardSerial[];
            this._cards = serializedCards.map((card) => new Card(card.suit as CardSuit, card.rank as CardRank));
        } else if (args.length === 0) {
            this.initRandomDeck();
        }
    }

    public initRandomDeck(): void {
        this._cards = [];
        const suits = Object.values(CardSuit);
        const ranks: CardRank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

        suits.forEach((suit) => {
            ranks.forEach((rank) => {
                this._cards.push(new Card(suit, rank));
            });
        });

        this.shuffle();
    }

    public shuffle(): void {
        this._cards = _.shuffle(this._cards);
    }

    public draw(numCards = 1): Card[] {
        return this._cards.splice(0, numCards);
    }

    public deal(numPlayers: number, numCardsPerPlayer: number, isSorted = false): Hand[] {
        const hands: Hand[] = [];
        for (let j = 0; j < numPlayers; j++) {
            const hand = new Hand();
            hand.draw(this, numCardsPerPlayer);
            hands.push(hand);
        }
        if (isSorted) {
            hands.forEach((hand) => hand.sort());
        }
        return hands;
    }

    public withdraw(card: Card): Card | undefined {
        const idx = this._cards.findIndex((c) => c.suit === card.suit && c.rank === card.rank);
        let removedCard = undefined;
        if (idx > -1) {
            const removedCards = this._cards.splice(idx, 1); // 2nd parameter means remove one item only
            removedCard = removedCards?.[0];
        }
        return removedCard;
    }

    get cards(): Card[] {
        return this._cards;
    }

    get serialize(): CardSerial[] {
        return this._cards.map((card) => card.serialize);
    }

    get size(): number {
        return this._cards.length;
    }

    getTopCards(numCards: number): Card[] {
        return this._cards.slice(Math.max(this._cards.length - numCards, 0));
    }

}