import { Images } from './../../utils/Images';
export enum CardSuit {
    CLUBS = "clubs",
    DIAMONDS = "diamonds",
    HEARTS = "hearts",
    SPADES = "spades"
}

export type CardRank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

export const RankToValue: { [key: string]: number } = {
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "10": 10,
    "J": 11,
    "Q": 12,
    "K": 13,
    "A": 14
};

export interface CardSerial {
    suit: string;
    rank: string;
    disabled: boolean;
}

export class Card {
    private _suit: CardSuit;
    private _rank: CardRank;
    private _disabled: boolean;

    constructor(suit: CardSuit, rank: CardRank, disabled = false) {
        this._suit = suit;
        this._rank = rank;
        this._disabled = disabled;
    }

    get suit(): CardSuit {
        return this._suit;
    }

    get rank(): CardRank {
        return this._rank;
    }

    get disabled(): boolean {
        return this._disabled;
    }

    get serialize(): CardSerial {
        return {
            suit: String(this._suit),
            rank: String(this._rank),
            disabled: this._disabled
        };
    }

    get image(): string {
        return Images.cards[`${this._rank}_${this._suit}`];
    }

    set disabled(disabled: boolean) {
        this._disabled = disabled;
    }
}