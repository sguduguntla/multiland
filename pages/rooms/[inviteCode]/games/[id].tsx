import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import useSWR from 'swr';
import useWindowDimensions from '../../../../hooks/useWindowDimensions';
import { getCollectionFetcher, getDocFetcher } from '../../../../lib/firebase';
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
  const { data: game, error: gameError } = useSWR(`games/${id}`, getDocFetcher);
  const { data: players, error: playersError } = useSWR(
    game?.id ? `games/${game.id}/players` : null,
    getCollectionFetcher
  );

  useEffect(() => {
    if (game?.id) {
      Palace.init(game?.id);
    }
  }, [game?.id]);

  console.log(players);

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

  const renderHand = () => {
    return <div></div>;
  };

  return (
    <div className="flex justify-center items-center">
      <Head>
        <title>{room?.name || 'Multiland'}</title>
        <meta name="description" content="Multiland!" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex flex-1 flex-col items-center w-full min-h-screen">
        <div
          className="rounded-lg relative border m-0 p-0"
          style={{ width: WINDOW_HEIGHT, height: WINDOW_HEIGHT }}
        >
          <div
            className="absolute top-0 text-center text-white flex items-center justify-center"
            style={{
              width: 100,
              height: 100,
              left: WINDOW_HEIGHT / 2 - 50,
            }}
          >
            <h1 className="text-2xl">{p1.name}</h1>
            {renderHand()}
          </div>
          <div
            className="absolute bg-red-500 bottom-0 rounded-full text-center text-white flex items-center justify-center"
            style={{
              width: 100,
              height: 100,
              left: WINDOW_HEIGHT / 2 - 50,
            }}
          >
            <h1 className="text-2xl">{p2.name}</h1>
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
