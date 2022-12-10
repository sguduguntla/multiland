import { doc, onSnapshot } from 'firebase/firestore';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
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

  const renderPlayer = (player: any, i: number) => {
    return (
      <div
        key={i}
        className="bg-blue-500 appearance-none truncate border-2 m-2 border-gray-200 rounded-full w-44 py-2 px-2 text-xl text-white text-center leading-tight focus:outline-none"
      >
        {player.name}
      </div>
    );
  };

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
          width={100}
          height={200}
          onClick={() => {
            Palace.withdrawFromHandToDeck(game?.id, player.id, hand, card);
          }}
          style={{ cursor: 'pointer' }}
        />
      );
    });
  };

  const activeCard = new Card(
    game?.activeDeck?.[game?.activeDeck?.length - 1]?.suit,
    game?.activeDeck?.[game?.activeDeck?.length - 1]?.rank
  );

  return (
    <div className="flex justify-center items-center">
      <Head>
        <title>{room?.name || 'Multiland'}</title>
        <meta name="description" content="Multiland!" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex flex-1 flex-col items-center w-full min-h-screen">
        <div className="rounded-lg border m-0 p-0 w-3/4 h-full">
          <div className="text-center text-white flex flex-col items-center w-full min-h-screen">
            <h1 className="text-2xl mt-4">{p1.name}</h1>
            <div className="flex flex-row space-x-4 border-2 border-red-500 mt-4">
              {renderHand(p1)}
            </div>
          </div>
          {game?.activeDeck?.length > 0 && (
            <>
              <Image
                src={activeCard.image}
                alt={`${activeCard.rank} of ${activeCard.suit}`}
                width={100}
                height={200}
              />
            </>
          )}
          <div
            className="absolute bg-red-500 bottom-0 rounded-full text-center text-white flex items-center justify-center"
            style={{
              width: 100,
              height: 100,
              left: WINDOW_HEIGHT / 2 - 50,
            }}
          >
            <div className="flex flex-row space-x-4 border-2 border-red-500 mt-4">
              {renderHand(p2)}
            </div>
            <h1 className="text-2xl mt-4">{p2.name}</h1>
          </div>
        </div>
        <div className="flex mt-8 w-3/4 flex-wrap">
          {players.map(renderPlayer)}
        </div>
      </main>
    </div>
  );
}

export default Game;
