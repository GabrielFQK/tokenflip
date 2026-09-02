import OBR from "https://cdn.jsdelivr.net/npm/@owlbear-rodeo/sdk@latest/+esm";

// Distância mínima (px de cena) pra considerar que houve arraste horizontal
const THRESHOLD = 2;

// Guarda a última posição X conhecida de cada item
const lastX = new Map();

function isCharacterToken(item) {
  return item.type === "IMAGE" && item.layer === "CHARACTER";
}

OBR.onReady(async () => {
  // Inicializa o cache de posições com os itens já existentes na cena
  const items = await OBR.scene.items.getItems();
  for (const item of items) {
    if (isCharacterToken(item)) {
      lastX.set(item.id, item.position.x);
    }
  }

  OBR.scene.items.onChange(async (items) => {
    const updates = []; // { id, dir: 1 (direita) | -1 (esquerda) }

    for (const item of items) {
      if (!isCharacterToken(item)) continue;

      const prevX = lastX.get(item.id);
      const currX = item.position.x;

      if (prevX !== undefined) {
        const dx = currX - prevX;
        if (Math.abs(dx) > THRESHOLD) {
          updates.push({ id: item.id, dir: dx > 0 ? 1 : -1 });
        }
      }

      lastX.set(item.id, currX);
    }

    // Remove do cache itens que saíram da cena
    const currentIds = new Set(items.map((i) => i.id));
    for (const id of lastX.keys()) {
      if (!currentIds.has(id)) lastX.delete(id);
    }

    if (updates.length === 0) return;

    await OBR.scene.items.updateItems(
      updates.map((u) => u.id),
      (draftItems) => {
        for (const draft of draftItems) {
          const update = updates.find((u) => u.id === draft.id);
          if (!update) continue;

          const mag = Math.abs(draft.scale.x);
          // Arte original olha pra ESQUERDA.
          // Arrastou pra direita (dir=1)  -> flipa (scale.x negativo)
          // Arrastou pra esquerda (dir=-1) -> normal (scale.x positivo)
          draft.scale.x = update.dir === 1 ? -mag : mag;
        }
      }
    );
  });
});
