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
import { Palace } from '../../../../lib/services/palace/Palace';
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

  console.log('MY PLAYERS', players);

  if (!room || !players?.length || !game) {
    return <div>loading...</div>;
  }

  const p1 = players[0];
  const p2 = players[1];

  console.log(players);

  const renderHand = (player: any) => {
    const hand = new Hand(player.hand);

    return player.hand.map((c: any, i: number) => {
      const card = new Card(c.suit, c.rank);
      const imageSrc = card.image;
      return (
        <Image
          src={imageSrc}
          key={i}
          alt={`${card.rank} of ${card.suit}`}
          width={90}
          height={180}
          onClick={() => {
            if (cmdKeyDown) {
              const idx = selectedCards.findIndex(
                (c) => card.rank === c.rank && card.suit === c.suit
              );
              if (idx > -1) {
                const newSelectedCards = [...selectedCards];
                newSelectedCards.splice(idx, 1);
                setSelectedCards(newSelectedCards);
              } else {
                setSelectedCards([...selectedCards, card]);
              }
            }
          }}
          className={clsx(styles.handCard, {
            'border-4 rounded-md border-red-500': !!selectedCards.find(
              (c) => card.rank === c.rank && card.suit === c.suit
            ),
          })}
        />
      );
    });
  };

  const renderDownCards = (player: any) => {
    const hand = new Hand(player.hand);

    return (
      <div className="relative w-full">
        <div className="flex flex-row justify-center mt-4 w-full">
          {player.faceDown.map((c: any, i: number) => {
            const card = new Card(c.suit, c.rank);
            const imageSrc = card.image;
            return (
              <div
                key={i}
                className="flex flex-row justify-center w-36 relative h-36"
              >
                <Image
                  src={imageSrc}
                  alt={`${card.rank} of ${card.suit}`}
                  width={90}
                  height={180}
                  style={{ position: 'absolute', zIndex: 1 }}
                />
                <Image
                  src={Images.cards.back}
                  key={i}
                  alt={`Facedown card`}
                  width={90}
                  height={180}
                  style={{ marginRight: 40, position: 'absolute' }}
                />
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

    if (!game?.activeDeck?.length) {
      return false;
    }

    return (
      <div className="flex flex-row justify-center w-full">
        <Image
          src={activeCard.image}
          alt={`${activeCard.rank} of ${activeCard.suit}`}
          width={100}
          height={200}
          style={{
            border: '1px solid black',
            borderRadius: 5,
            boxShadow: '0px 0px 40px 10px #0ff',
          }}
        />
      </div>
    );
  };

  const myPlayer = players[0];
  const myHand = myPlayer.hand;

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
            Palace.withdrawFromHandToDeck(
              game?.id,
              myPlayer.id,
              new Hand(myHand),
              selectedCards
            );
            setSelectedCards([]);
          }
        }}
        tabIndex={0}
      >
        <div className="rounded-lg flex flex-col m-0 p-0 w-3/4 min-h-screen">
          <div className="text-center text-white flex-none w-full">
            <h1 className="text-2xl mt-4">{p1.name}</h1>
            <div className="flex flex-row justify-center space-x-4 mt-4">
              {renderHand(p1)}
            </div>
            {renderDownCards(p1)}
          </div>
          <div className="grow"></div>
          {renderActiveDeck()}
          <div className="grow"></div>
          <div className="text-center text-white flex-none items-center w-full">
            {renderDownCards(p2)}
            <div className="flex flex-row justify-center space-x-4 my-4">
              {renderHand(p2)}
            </div>
            <h1 className="text-2xl mb-4">{p2.name}</h1>
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
