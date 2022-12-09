import { Card, CardRank, CardSerial, CardSuit } from "./Card";
import { Deck } from "./Deck";

export class Hand {
    private _cards: Card[] = [];

    constructor(...args: any[]) {
        if (args.length === 1) {
            const serializedCards = args[1] as CardSerial[];
            this._cards = serializedCards.map((card) => new Card(card.suit as CardSuit, card.rank as CardRank));
        } else if (args.length === 0) {
            this._cards = [];
        }
    }

    public draw(deck: Deck, numCards = 1): Card[] {
        const cards = deck.draw(numCards);
        if (cards?.length) {
            this._cards.push(...cards);
        }
        return cards;
    }

    public withdraw(suit: CardSuit, rank: CardRank): Card | undefined {
        const idx = this._cards.findIndex((card) => card.suit === suit && card.rank === rank);
        let card = undefined;
        if (idx > -1) {
            const removedCards = this._cards.splice(idx, 1); // 2nd parameter means remove one item only
            card = removedCards?.[0];
        }
        return card;
    }

    get cards(): Card[] {
        return this._cards;
    }

    get serialize(): CardSerial[] {
        return this._cards.map((card) => card.serialize);
    }

}