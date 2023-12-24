import { coordinates_array, bitCoordinates_array } from "./constants";

type Coordinates = {
	[key: string]: number;
};

const coordinatesMapping: Coordinates = coordinates_array.reduce((map, coord, index) => {
	map[coord] = parseInt(bitCoordinates_array[index]);
	return map;
}, {} as { [key: string]: number });

// Converts two 8-bit integers to a 16-bit integer
function convertToMove(fromPos: number, toPos: number): number {
	let move = fromPos;
	move = move << 6;
	move += toPos;
	return move;
}

// Converts an algebraic chess notation string move to uint16 format
export function moveToHex(move: string): number {
	const byteString = move.split("");

	const fromPosStr = byteString.slice(0, 2).join("");
	const toPosStr = byteString.slice(2, 4).join("");

	const fromPos = coordinatesMapping[fromPosStr];
	const toPos = coordinatesMapping[toPosStr];

	const hexMove = convertToMove(fromPos, toPos);

	return hexMove;
}
