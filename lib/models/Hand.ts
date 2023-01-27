import { Card, CardRank, CardSerial, CardSuit, RankToValue } from "./Card";
import { Deck } from "./Deck";

export class Hand {
    private _cards: Card[] = [];

    constructor(...args: any[]) {
        if (args.length === 1) {
            const serializedCards = args[0] as CardSerial[];
            this._cards = serializedCards.map((card) => new Card(card.suit as CardSuit, card.rank as CardRank, card.disabled));
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

    get size(): number {
        return this._cards.length;
    }

    get serialize(): CardSerial[] {
        return this._cards.map((card) => card.serialize);
    }

    get allDisabled(): boolean {
        return this._cards.every((card) => card.disabled);
    }

    public sort(): void {
        this._cards.sort((c1, c2) => {
            return RankToValue[c1.rank] - RankToValue[c2.rank]
        });
    }

    public addCard(card: Card): void {
        this._cards.push(card);
    }

}