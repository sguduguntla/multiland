export enum CardSuit {
    CLUBS = "clubs",
    DIAMONDS = "diamonds",
    HEARTS = "hearts",
    SPADES = "spades"
}

export type CardRank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

export interface CardSerial {
    suit: string;
    rank: string;
}

export class Card {
    private _suit: CardSuit;
    private _rank: CardRank;

    constructor(suit: CardSuit, rank: CardRank) {
        this._suit = suit;
        this._rank = rank;
    }

    get suit(): CardSuit {
        return this._suit;
    }

    get rank(): CardRank {
        return this._rank;
    }

    get serialize(): CardSerial {
        return {
            suit: String(this._suit),
            rank: String(this._rank)
        };
    }
}