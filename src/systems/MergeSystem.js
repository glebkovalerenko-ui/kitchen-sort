// /src/systems/MergeSystem.js
import { RECIPES } from '../gameConfig.js';

export default class MergeSystem {
    constructor() {}

    // Ищет рецепт для двух типов предметов
    findRecipe(type1, type2) {
        for (const recipe of RECIPES) {
            if ((recipe.inputs[0] === type1 && recipe.inputs[1] === type2) ||
                (recipe.inputs[0] === type2 && recipe.inputs[1] === type1)) {
                return recipe;
            }
        }
        return null;
    }
}