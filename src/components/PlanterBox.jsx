import { useEffect, useRef } from "react";

const TILE_SIZE = 16; // Each tile is 16x16 pixels
const MEGABLOCK_SIZE = 2; // Each megablock is 2x2 tiles
const MEGABLOCK_WIDTH = 8; // 🔹 8 megablocks across
const MEGABLOCK_HEIGHT = 4; // 🔹 4 megablocks down
const BOX_WIDTH_TILES = MEGABLOCK_WIDTH * MEGABLOCK_SIZE + 2; // ✅ Includes outer frame
const BOX_HEIGHT_TILES = MEGABLOCK_HEIGHT * MEGABLOCK_SIZE + 2; // ✅ Includes outer frame
const SPACING_TILES = 2; // Adjusted spacing

// ✅ Ensuring the correct Minecraft-style snow texture is mapped
const TILE_MAPS = {
  winter: { interior: [0, TILE_SIZE * 2] }, // ✅ Snow texture
  spring: { interior: [TILE_SIZE * 5, TILE_SIZE] }, // Regular dirt
};

// ✅ Ensure all bottom edges, including corners, are correctly mapped
const TILE_MAP = {
  cornerTopLeft: [0, 0],      
  cornerTopRight: [TILE_SIZE * 2, 0], 
  cornerBottomLeft: [0, TILE_SIZE],   
  cornerBottomRight: [TILE_SIZE * 2, TILE_SIZE], 
  edgeTop: [TILE_SIZE, 0],    
  edgeBottom: [TILE_SIZE, TILE_SIZE], 
  edgeLeft: [0, TILE_SIZE],   
  edgeRight: [TILE_SIZE * 2, TILE_SIZE], 
};

export default function PlanterBox({ season = "winter" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const sprite = new Image();
    sprite.src = "/gardenpalooza/corrected_spritesheet.png"; // ✅ Ensure this is the correct path Gavin

    sprite.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const boxPositions = [
        { x: 0, y: 0 }, // Top left
        { x: BOX_WIDTH_TILES + SPACING_TILES, y: 0 }, // Top middle
        { x: (BOX_WIDTH_TILES + SPACING_TILES) * 2, y: 0 }, // Top right

        { x: (BOX_WIDTH_TILES + SPACING_TILES), y: BOX_HEIGHT_TILES + SPACING_TILES }, // Bottom middle
        { x: (BOX_WIDTH_TILES + SPACING_TILES) * 2, y: BOX_HEIGHT_TILES + SPACING_TILES }, // Bottom right
      ];
      
      for (const { x: boxX, y: boxY } of boxPositions) {
        for (let y = 0; y < BOX_HEIGHT_TILES; y++) {
          for (let x = 0; x < BOX_WIDTH_TILES; x++) {
            let sx, sy;

            if (x === 0 && y === 0) [sx, sy] = TILE_MAP.cornerTopLeft;
            else if (x === BOX_WIDTH_TILES - 1 && y === 0) [sx, sy] = TILE_MAP.cornerTopRight;
            else if (x === 0 && y === BOX_HEIGHT_TILES - 1) [sx, sy] = TILE_MAP.cornerBottomLeft;
            else if (x === BOX_WIDTH_TILES - 1 && y === BOX_HEIGHT_TILES - 1) [sx, sy] = TILE_MAP.cornerBottomRight;
            else if (y === 0) [sx, sy] = TILE_MAP.edgeTop;
            else if (y === BOX_HEIGHT_TILES - 1) [sx, sy] = TILE_MAP.edgeBottom;
            else if (x === 0) [sx, sy] = TILE_MAP.edgeLeft;
            else if (x === BOX_WIDTH_TILES - 1) [sx, sy] = TILE_MAP.edgeRight;
            else [sx, sy] = TILE_MAPS[season].interior; 

            ctx.drawImage(
              sprite,
              sx,
              sy,
              TILE_SIZE,
              TILE_SIZE,
              (boxX + x) * TILE_SIZE,
              (boxY + y) * TILE_SIZE,
              TILE_SIZE,
              TILE_SIZE
            );
          }
        }
      }
    };
  }, [season]);

  const totalWidth = (BOX_WIDTH_TILES + SPACING_TILES) * 3 * TILE_SIZE;
  const totalHeight = (BOX_HEIGHT_TILES + SPACING_TILES) * 2 * TILE_SIZE;

  return <canvas ref={canvasRef} width={totalWidth} height={totalHeight}></canvas>;
}
