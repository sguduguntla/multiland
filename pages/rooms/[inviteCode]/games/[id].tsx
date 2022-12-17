import clsx from 'clsx';
import { doc, onSnapshot } from 'firebase/firestore';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import useWindowDimensions from '../../../../hooks/useWindowDimensions';
import db, {
  getCollectionFetcher,
  getDocFetcher,
} from '../../../../lib/firebase';
import { Card } from '../../../../lib/models/Card';
import { Hand } from '../../../../lib/models/Hand';
import {
  INIT_FACE_DOWN_CARDS_PER_PLAYER,
  Palace,
} from '../../../../lib/services/palace/Palace';
import { RoomService } from '../../../../lib/services/Room';
import styles from '../../../../styles/Game.module.css';
import { Images } from '../../../../utils/Images';

const fetcher = async (key: string, inviteCode: string) => {
  return RoomService.getRoomByInviteCode(inviteCode);
};

function Game() {
  const router = useRouter();
  const { height, width } = useWindowDimensions();
  const WINDOW_HEIGHT = height as number;
  const WINDOW_WIDTH = width as number;
  const { id, inviteCode } = router.query;
  const { data: room, error: roomError } = useSWR(
    ['roomByInviteCode', inviteCode],
    fetcher
  );
  const {
    data: game,
    error: gameError,
    mutate: mutateGame,
  } = useSWR(`games/${id}`, getDocFetcher);
  const {
    data: players,
    error: playersError,
    mutate: mutatePlayers,
  } = useSWR(
    game?.id ? `games/${game.id}/players` : null,
    getCollectionFetcher
  );
  const [cmdKeyDown, setCmdKeyDown] = useState(false);
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);

  const onPlayerSnapshots = () => {
    const unsubscribers: any[] = [];

    players?.forEach((p) => {
      const unsubscribe = onSnapshot(
        doc(db, `games/${game?.id}/players/${p.id}`),
        (pDoc) => {
          const player = { id: pDoc.id, ...pDoc.data() };
          mutatePlayers([...players.filter((p) => p.id !== player.id), player]);
        }
      );
      unsubscribers.push(unsubscribe);
    });

    return unsubscribers;
  };

  const onGameSnapshot = () => {
    return onSnapshot(doc(db, `games/${game?.id}`), (gDoc) => {
      const game = { id: gDoc.id, ...gDoc.data() };
      mutateGame(game);
    });
  };

  useEffect(() => {
    let unsubscribers: any[] = [];
    if (game?.id && players?.length) {
      Palace.init(game?.id);
      unsubscribers.push(...onPlayerSnapshots());
      unsubscribers.push(onGameSnapshot());
    }
    () => unsubscribers.map((u) => u());
  }, [game?.id, players?.length]);

  if (!room || !players?.length || !game) {
    return <div>loading...</div>;
  }

  console.log('MY PLAYERS', players);

  console.log(players);

  const myPlayerIdx = players.findIndex(
    (p) =>
      p.id ===
      (typeof window !== 'undefined' && localStorage.getItem('playerId'))
  );

  let p1: any, p2: any;

  if (myPlayerIdx === 0) {
    p1 = players[0];
    p2 = players[1];
  } else {
    p1 = players[1];
    p2 = players[0];
  }

  const myHand = p1.hand;
  const startedGame = !!(p1.chosenFaceUp && p2.chosenFaceUp);
  const myTurn = game?.playerTurn === p1.id;

  const renderHand = (player: any) => {
    const hand = new Hand(player.hand);

    return player.hand.map((c: any, i: number) => {
      const card = new Card(c.suit, c.rank, c.disabled);
      const imageSrc = card.image;
      return (
        <Image
          src={imageSrc}
          key={i}
          alt={`${card.rank} of ${card.suit}`}
          width={90}
          height={180}
          onClick={() => {
            if (cmdKeyDown && player.id === p1.id) {
              if (startedGame && player.id !== game?.playerTurn) {
                return;
              }
              const idx = selectedCards.findIndex(
                (c) => card.rank === c.rank && card.suit === c.suit
              );
              if (idx > -1) {
                const newSelectedCards = [...selectedCards];
                newSelectedCards.splice(idx, 1);
                setSelectedCards(newSelectedCards);
              } else {
                if (
                  !p1.chosenFaceUp &&
                  selectedCards.length ===
                    INIT_FACE_DOWN_CARDS_PER_PLAYER - player.faceUp.length
                ) {
                  // If they've selected 3 cards for their face up cards already, don't let them choose anymore
                  return;
                }

                setSelectedCards([...selectedCards, card]);
              }
            }
          }}
          className={
            player.id == p1.id
              ? clsx(
                  {
                    [styles.handCard]:
                      cmdKeyDown &&
                      !(startedGame && player.id !== game?.playerTurn) &&
                      !card.disabled,
                    [styles.disabledCard]: card.disabled,
                  },
                  {
                    'border-4 rounded-md border-red-500': !!selectedCards.find(
                      (c) => card.rank === c.rank && card.suit === c.suit
                    ),
                  }
                )
              : ''
          }
        />
      );
    });
  };

  const renderDownCards = (player: any) => {
    const hand = new Hand(player.hand);

    const totalIters = Math.max(player.faceDown.length, player.faceUp.length);

    return (
      <div className="relative w-full">
        <div className="flex flex-row justify-center mt-4 w-full">
          {new Array(totalIters).fill(0).map((c: any, i: number) => {
            const faceDownCard =
              i < player.faceDown.length
                ? new Card(player.faceDown[i].suit, player.faceDown[i].rank)
                : null;
            const faceUpCard =
              i < player.faceUp.length
                ? new Card(player.faceUp[i].suit, player.faceUp[i].rank)
                : null;

            return (
              <div
                key={i}
                className="flex flex-row justify-center w-36 relative h-36"
              >
                {faceUpCard && (
                  <Image
                    src={faceUpCard.image}
                    alt={`${faceUpCard.rank} of ${faceUpCard.suit}`}
                    width={90}
                    height={180}
                    style={{ position: 'absolute', zIndex: 1 }}
                  />
                )}
                {faceDownCard && (
                  <Image
                    src={Images.cards.back}
                    key={i}
                    alt={`Facedown card`}
                    width={90}
                    height={180}
                    style={{
                      marginRight: faceUpCard ? 40 : 0,
                      position: 'absolute',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderActiveDeck = () => {
    const activeCard = new Card(
      game?.activeDeck?.[game?.activeDeck?.length - 1]?.suit,
      game?.activeDeck?.[game?.activeDeck?.length - 1]?.rank
    );

    return (
      <div className="flex flex-row justify-center w-full space-x-12">
        {game?.activeDeck?.length > 0 && (
          <div className="relative flex flex-row justify-center w-40 h-36">
            {game.activeDeck
              .slice(game?.activeDeck?.length - 4)
              .map((c: any, i: number) => {
                const card = new Card(c.suit, c.rank);

                return (
                  <Image
                    key={i}
                    src={card.image}
                    alt={`${card.rank} of ${card.suit}`}
                    width={100}
                    height={200}
                    style={{
                      border: '1px solid black',
                      borderRadius: 5,
                      marginLeft: i * 40,
                      position: 'absolute',
                    }}
                  />
                );
              })}
          </div>
        )}

        {game?.deck?.length > 0 && (
          <Image
            src={Images.cards.back}
            alt={`Deck`}
            width={100}
            height={200}
            style={{
              border: '1px solid black',
              borderRadius: 5,
              boxShadow: '0px 0px 40px 10px #a4ff7d',
            }}
            onClick={() => {
              if (startedGame && myTurn) {
                // If it's the current player's turn, draw 1 card from deck
                Palace.drawFromDeckToHand(
                  game?.id,
                  p1.id,
                  p2.id,
                  new Hand(myHand),
                  1
                );
              }
            }}
            className={clsx({
              [styles.handCard]: startedGame && myTurn,
            })}
          />
        )}
      </div>
    );
  };

  const renderMessage = () => {
    if (!p1.chosenFaceUp) {
      const remainingCards = INIT_FACE_DOWN_CARDS_PER_PLAYER - p1.faceUp.length;

      return (
        <h1>
          Select {remainingCards} card{remainingCards === 1 ? '' : 's'} to put
          down face up
        </h1>
      );
    }

    if (!p2.chosenFaceUp) {
      const remainingCards = INIT_FACE_DOWN_CARDS_PER_PLAYER - p2.faceUp.length;

      return (
        <h1>
          Waiting for {p2.name} to choose {remainingCards} card
          {remainingCards === 1 ? '' : 's'} to put down face up
        </h1>
      );
    }

    if (p1.id === game.playerTurn) {
      return <h1>It&apos;s your turn!</h1>;
    }

    if (p2.id === game.playerTurn) {
      return <h1>Waiting for {p2.name} to play their turn</h1>;
    }

    return null;
  };

  return (
    <div className="flex justify-center items-center">
      <Head>
        <title>{room?.name || 'Multiland'}</title>
        <meta name="description" content="Multiland!" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main
        className="flex flex-1 flex-col items-center w-full min-h-screen"
        onKeyDown={(e) => {
          if (e.key === 'Shift') {
            setCmdKeyDown(true);
          }
        }}
        onKeyUp={(e) => {
          setCmdKeyDown(false);
          if (e.key === 'Enter' && selectedCards.length > 0) {
            if (!p1.chosenFaceUp) {
              // If they haven't selected face cards yet, select them
              Palace.selectFaceCards(
                game?.id,
                p1.id,
                new Hand(myHand),
                selectedCards
              );
            } else {
              Palace.withdrawFromHandToDeck(
                game?.id,
                p1.id,
                p2.id,
                new Hand(myHand),
                selectedCards
              );
            }

            setSelectedCards([]);
          }
        }}
        tabIndex={0}
      >
        <div className="absolute top-10 left-10">
          <h1 className="underline underline-offset-4">
            <strong>CONTROLS</strong>
          </h1>
          <ul className="mt-4 list-disc">
            <li>
              Hold <strong>&apos;Shift&apos;</strong> Key &amp; click to select
              cards
            </li>
          </ul>
        </div>
        <div className="absolute top-10 right-10">{renderMessage()}</div>
        <div className="rounded-lg flex flex-col m-0 p-0 w-3/4 min-h-screen">
          <div className="text-center text-white flex-none w-full">
            <h1 className="text-2xl mt-4">{p2.name}</h1>
            <div className="flex flex-row justify-center space-x-4 mt-4">
              {renderHand(p2)}
            </div>
            {renderDownCards(p2)}
          </div>
          <div className="grow"></div>
          {renderActiveDeck()}
          <div className="grow"></div>
          <div className="text-center text-white flex-none items-center w-full">
            {renderDownCards(p1)}
            <div className="flex flex-row justify-center space-x-4 my-4">
              {renderHand(p1)}
            </div>
            <h1 className="text-2xl mb-4">{p1.name}</h1>
          </div>
          {/* <div
            className="absolute bg-red-500 bottom-0 rounded-full text-center text-white flex items-center justify-center"
            style={{
              width: 100,
              height: 100,
              left: WINDOW_HEIGHT / 2 - 50,
            }}
          >
           
          </div> */}
        </div>
      </main>
    </div>
  );
}

export default Game;
