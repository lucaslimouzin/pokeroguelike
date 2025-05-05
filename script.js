// Système de progression permanente
const gameProgress = {
    // Statistiques globales
    totalRuns: 0,
    bestScore: 0,
    totalVictories: 0,
    
    // Déblocage des Pokémon
    unlockedStarters: {
        1: true,  // Bulbizarre toujours débloqué
        4: true,  // Salamèche toujours débloqué
        7: true,  // Carapuce toujours débloqué
        25: false, // Pikachu à débloquer
        133: false, // Évoli à débloquer
        152: false, // Germignon à débloquer
    },
    
    // Améliorations permanentes
    permanentUpgrades: {
        maxHpBonus: 0,
        attackBonus: 0,
        defenseBonus: 0,
        criticalChance: 0,
    },
    
    // Or du joueur (remplace les points de progression)
    gold: 0,
};

// Variables globales pour le combat
let currentPokemonData = {
    ally: null,
    enemy: null,
    moves: [],
    enemyMoves: [],
    currentEnemyId: 1,
    gameStarted: false,
    battleSpeed: 1500, // Délai entre les actions en ms
    score: 0, // Pour suivre le nombre de victoires
    allyId: null, // Pour stocker l'ID du Pokémon allié
    allyLevel: 1, // Niveau du Pokémon allié
    allyCurrHP: null, // Pour stocker les HP actuels entre les combats
    allyMaxHP: null, // Pour stocker les HP max entre les combats
    
    // Statistiques de la run actuelle
    currentRun: {
        temporaryUpgrades: [], // Bonus temporaires pour cette run
        pokemonDefeated: [], // Liste des Pokémon vaincus
        turnsPlayed: 0,
        criticalHits: 0,
        damageDealt: 0,
        damageReceived: 0,
        experienceGained: 0, // Expérience gagnée
        levelUps: 0 // Nombre de montées de niveau
    }
};

// Variables globales pour les bonus de run
const runBonuses = [
    {
        id: 'hp_boost',
        name: 'Endurance',
        description: 'HP Max +20%',
        effect: (pokemon) => {
            const baseHP = pokemon.stats.find(stat => stat.stat.name === 'hp').base_stat;
            const maxHP = calculateMaxHP(baseHP, currentPokemonData.allyLevel);
            const bonusHP = Math.floor(maxHP * 0.2);
            return { stat: 'hp', value: bonusHP };
        }
    },
    {
        id: 'attack_boost',
        name: 'Force',
        description: 'Attaque +15%',
        effect: (pokemon) => {
            const baseAttack = pokemon.stats.find(stat => stat.stat.name === 'attack').base_stat;
            const bonusAttack = Math.floor(baseAttack * 0.15);
            return { stat: 'attack', value: bonusAttack };
        }
    },
    {
        id: 'defense_boost',
        name: 'Robustesse',
        description: 'Défense +15%',
        effect: (pokemon) => {
            const baseDefense = pokemon.stats.find(stat => stat.stat.name === 'defense').base_stat;
            const bonusDefense = Math.floor(baseDefense * 0.15);
            return { stat: 'defense', value: bonusDefense };
        }
    },
    {
        id: 'crit_chance',
        name: 'Précision',
        description: 'Chance de coup critique +10%',
        effect: () => {
            return { stat: 'crit', value: 10 };
        }
    },
    {
        id: 'type_boost',
        name: 'Affinité Élémentaire',
        description: 'Attaques du même type que le Pokémon +20%',
        effect: () => {
            return { stat: 'stab', value: 0.2 };
        }
    },
    {
        id: 'pp_boost',
        name: 'Endurance',
        description: 'PP de toutes les attaques +3',
        effect: () => {
            return { stat: 'pp', value: 3 };
        }
    }
];

// Fonction pour afficher un message
async function displayMessage(message) {
    const messageElement = document.getElementById('battle-message');
    messageElement.textContent = message;
    // Retourner une promesse qui se résout après un délai
    return new Promise(resolve => setTimeout(resolve, 1500));
}

// Fonction pour mettre à jour l'affichage de la progression
function updateProgress() {
    document.getElementById('current-progress').textContent = `Pokémon #${currentPokemonData.currentEnemyId}`;
    document.getElementById('current-score').textContent = currentPokemonData.score;
    
    // Mettre à jour l'affichage des Gold dans l'interface de combat
    if (document.getElementById('battle-gold')) {
        document.getElementById('battle-gold').textContent = gameProgress.gold;
    }
}

// Fonction pour mettre à jour l'affichage des bonus actifs
function updateActiveBonuses() {
    const bonusContainer = document.getElementById('active-bonuses');
    if (!bonusContainer) return;
    
    // Vider le conteneur
    bonusContainer.innerHTML = '';
    
    // Si aucun bonus actif, ne rien afficher
    if (!currentPokemonData.currentRun.temporaryUpgrades || currentPokemonData.currentRun.temporaryUpgrades.length === 0) {
        return;
    }
    
    // Ajouter chaque bonus actif
    currentPokemonData.currentRun.temporaryUpgrades.forEach(bonus => {
        const bonusBadge = document.createElement('div');
        bonusBadge.className = `bonus-badge ${bonus.id}`;
        
        // Créer une petite icône selon le type de bonus
        let icon = '✨';
        switch (bonus.id) {
            case 'hp_boost':
                icon = '❤️';
                break;
            case 'attack_boost':
                icon = '⚔️';
                break;
            case 'defense_boost':
                icon = '🛡️';
                break;
            case 'crit_chance':
                icon = '🎯';
                break;
            case 'type_boost':
                icon = '⭐';
                break;
            case 'pp_boost':
                icon = '🔄';
                break;
        }
        
        bonusBadge.innerHTML = `<span>${icon}</span> ${bonus.name}`;
        bonusContainer.appendChild(bonusBadge);
    });
}

// Fonction pour gérer la transition vers la scène de combat
function startBattle() {
    const startScreen = document.getElementById('start-screen');
    const battleScene = document.getElementById('battle-scene');
    const bonusScreen = document.getElementById('bonus-screen');

    // S'assurer que l'écran de bonus est caché
    if (bonusScreen) {
        bonusScreen.style.display = 'none';
    }

    // Animation de transition
    startScreen.style.opacity = '0';
    setTimeout(async () => {
        startScreen.style.display = 'none';
        battleScene.style.display = 'flex';
        setTimeout(async () => {
            battleScene.style.opacity = '1';
            
            // Générer un ID aléatoire pour le Pokémon allié seulement au premier combat
            if (currentPokemonData.allyId === null) {
                currentPokemonData.allyId = getRandomInt(1, 151);
            }
            
            // Mettre à jour l'affichage de la progression
            updateProgress();
            
            // Mettre à jour l'affichage des Gold dans l'interface de combat
            if (document.getElementById('battle-gold')) {
                document.getElementById('battle-gold').textContent = gameProgress.gold;
            }
            
            // Mettre à jour l'affichage des bonus actifs
            updateActiveBonuses();
            
            // Charger les deux Pokémon
            await Promise.all([
                getPokemonById(currentPokemonData.allyId, 'left'),
                getPokemonById(currentPokemonData.currentEnemyId, 'right')
            ]);

            currentPokemonData.gameStarted = true;
            await displayMessage('Le combat commence !');
            
            // Démarrer le combat automatique après un court délai
            setTimeout(() => {
                const bestMove = chooseBestMove(currentPokemonData.moves, currentPokemonData.ally, currentPokemonData.enemy);
                if (bestMove.move) {
                    executeMove(bestMove.index, true);
                }
            }, currentPokemonData.battleSpeed);
        }, 50);
    }, 500);
}

// Fonction pour obtenir un nombre aléatoire entre min et max
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Fonction pour calculer les HP max en fonction du niveau
function calculateMaxHP(baseHP, level) {
    return Math.floor((2 * baseHP * level) / 100 + level + 10);
}

// Fonction pour calculer une statistique en fonction du niveau
function calculateStat(baseStat, level) {
    return Math.floor((2 * baseStat * level) / 100 + 5);
}

// Fonction pour gagner de l'expérience après une victoire
function gainExperience() {
    // Formule simplifiée: enemyLevel * 50
    const enemyLevel = Math.min(currentPokemonData.currentEnemyId, 10); // Max niveau 10 pour les ennemis
    const expGained = enemyLevel * 50;
    
    // Afficher l'expérience gagnée
    displayMessage(`${expGained} points d'expérience gagnés !`);
    
    // Ajouter l'expérience
    currentPokemonData.currentRun.experienceGained += expGained;
    
    // Vérifier si le Pokémon peut monter de niveau
    checkLevelUp();
}

// Fonction pour vérifier si le niveau peut augmenter
async function checkLevelUp() {
    // Formule simplifiée pour l'expérience nécessaire: level * level * 100
    const currentLevel = currentPokemonData.allyLevel;
    const expNeeded = currentLevel * currentLevel * 100;
    
    if (currentPokemonData.currentRun.experienceGained >= expNeeded) {
        // Montée de niveau
        currentPokemonData.allyLevel++;
        currentPokemonData.currentRun.levelUps++;
        currentPokemonData.currentRun.experienceGained -= expNeeded;
        
        // Mettre à jour l'affichage du niveau
        document.querySelector('.ally .level').textContent = `Nv. ${currentPokemonData.allyLevel}`;
        
        // Recalculer les statistiques
        if (currentPokemonData.ally) {
            // Mettre à jour les HP
            const baseHP = currentPokemonData.ally.stats.find(stat => stat.stat.name === 'hp').base_stat;
            const newMaxHP = calculateMaxHP(baseHP, currentPokemonData.allyLevel);
            const hpIncrease = newMaxHP - parseInt(document.getElementById('max-hp-left').textContent);
            
            // Afficher le message
            await displayMessage(`${currentPokemonData.ally.name} monte au niveau ${currentPokemonData.allyLevel} !`);
            await displayMessage(`HP +${hpIncrease} !`);
            
            // Mettre à jour l'affichage des HP
            document.getElementById('current-hp-left').textContent = parseInt(document.getElementById('current-hp-left').textContent) + hpIncrease;
            document.getElementById('max-hp-left').textContent = newMaxHP;
            updateHPDisplay('left', parseInt(document.getElementById('current-hp-left').textContent), newMaxHP);
        }
    }
}

// Fonction pour calculer les dégâts
function calculateDamage(move, attacker, defender, attackerLevel) {
    // Formule simplifiée des dégâts Pokémon avec niveau
    const power = move.power || 0;
    const attackBase = attacker.stats.find(stat => stat.stat.name === 'attack').base_stat;
    const defenseBase = defender.stats.find(stat => stat.stat.name === 'defense').base_stat;
    
    // Calculer les stats en fonction du niveau
    let attack = calculateStat(attackBase, attackerLevel);
    let defense = calculateStat(defenseBase, attackerLevel);
    
    // Appliquer les bonus temporaires pour l'attaquant allié
    if (attacker === currentPokemonData.ally && currentPokemonData.currentRun.temporaryUpgrades.length) {
        currentPokemonData.currentRun.temporaryUpgrades.forEach(bonus => {
            const effect = bonus.effect(attacker);
            if (effect.stat === 'attack') {
                attack += effect.value;
            }
        });
    }
    
    // Appliquer les bonus temporaires pour le défenseur allié
    if (defender === currentPokemonData.ally && currentPokemonData.currentRun.temporaryUpgrades.length) {
        currentPokemonData.currentRun.temporaryUpgrades.forEach(bonus => {
            const effect = bonus.effect(defender);
            if (effect.stat === 'defense') {
                defense += effect.value;
            }
        });
    }
    
    // Formule: ((2 * niveau * 0.4 + 2) * puissance * attaque / défense) / 50 + 2
    let damage = Math.floor(((2 * attackerLevel * 0.4 + 2) * power * attack / defense) / 50 + 2);
    
    // Vérifier si l'attaque est du même type que l'attaquant (STAB - Same Type Attack Bonus)
    const moveType = move.type.name.toLowerCase();
    const attackerTypes = attacker.types.map(t => t.type.name.toLowerCase());
    let stabMultiplier = 1;
    
    if (attackerTypes.includes(moveType)) {
        stabMultiplier = 1.5; // Bonus STAB standard
        
        // Vérifier si l'attaquant a un bonus d'affinité élémentaire
        if (attacker === currentPokemonData.ally) {
            const stabBonus = currentPokemonData.currentRun.temporaryUpgrades.find(bonus => bonus.id === 'type_boost');
            if (stabBonus) {
                const effect = stabBonus.effect();
                stabMultiplier += effect.value;
            }
        }
    }
    
    damage = Math.floor(damage * stabMultiplier);
    
    // Vérifier les coups critiques
    let isCritical = false;
    let critChance = 6.25; // 1/16 chance de base (6.25%)
    
    // Ajouter les bonus de coup critique
    if (attacker === currentPokemonData.ally) {
        const critBonus = currentPokemonData.currentRun.temporaryUpgrades.find(bonus => bonus.id === 'crit_chance');
        if (critBonus) {
            const effect = critBonus.effect();
            critChance += effect.value;
        }
    }
    
    if (Math.random() * 100 < critChance) {
        damage = Math.floor(damage * 1.5);
        isCritical = true;
        
        if (attacker === currentPokemonData.ally) {
            currentPokemonData.currentRun.criticalHits++;
        }
    }
    
    // Ajout d'un élément aléatoire (85-100%)
    damage = Math.floor(damage * (85 + Math.random() * 15) / 100);
    
    return {
        damage: Math.max(1, damage), // Au moins 1 point de dégâts
        isCritical
    };
}

// Fonction pour mettre à jour l'affichage des HP avec message
async function updateHPDisplay(position, currentHP, maxHP, damage = 0) {
    const hpText = document.getElementById(`current-hp-${position}`);
    const hpBar = document.getElementById(`hp-bar-${position}`);
    const pokemonName = document.getElementById(`pokemon-name-${position}`).textContent;
    
    if (damage > 0) {
        await displayMessage(`${pokemonName} perd ${damage} HP !`);
    }
    
    hpText.textContent = currentHP;
    const hpPercentage = (currentHP / maxHP) * 100;
    hpBar.style.width = `${hpPercentage}%`;
    
    // Changer la couleur de la barre de HP en fonction du pourcentage
    if (hpPercentage > 50) {
        hpBar.style.background = '#3C0';
    } else if (hpPercentage > 20) {
        hpBar.style.background = '#FC0';
    } else {
        hpBar.style.background = '#F00';
    }
    
    // Sauvegarder les HP du Pokémon allié pour le prochain combat
    if (position === 'left') {
        currentPokemonData.allyCurrHP = currentHP;
        currentPokemonData.allyMaxHP = maxHP;
    }
}

// Fonction pour mettre à jour l'affichage des PP
function updatePPDisplay(moveIndex, currentPP, maxPP) {
    const moveButton = document.getElementById(`move-${moveIndex}`);
    const ppElement = moveButton.querySelector('.move-pp');
    ppElement.textContent = `PP ${currentPP}/${maxPP}`;
}

// Fonction pour calculer l'efficacité du type
function calculateTypeEffectiveness(moveType, defenderTypes) {
    const typeChart = {
        normal: { rock: 0.5, ghost: 0, steel: 0.5 },
        fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
        water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
        electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
        grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
        ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
        fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
        poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
        ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
        flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
        psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
        bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
        rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
        ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
        dragon: { dragon: 2, steel: 0.5, fairy: 0 },
        dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
        steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
        fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 }
    };

    let effectiveness = 1;
    defenderTypes.forEach(defenderType => {
        if (typeChart[moveType.toLowerCase()] && typeChart[moveType.toLowerCase()][defenderType.toLowerCase()]) {
            effectiveness *= typeChart[moveType.toLowerCase()][defenderType.toLowerCase()];
        }
    });
    return effectiveness;
}

// Fonction pour évaluer la meilleure attaque
function evaluateMove(move, attacker, defender) {
    if (!move || !move.moveData) return 0;

    const power = move.moveData.power || 0;
    const accuracy = move.moveData.accuracy || 100;
    const pp = move.currentPP;
    
    if (pp <= 0) return 0;

    // Calculer l'efficacité du type
    const effectiveness = calculateTypeEffectiveness(
        move.moveData.type.name,
        defender.types.map(t => t.type.name)
    );

    // Score basé sur les dégâts potentiels, la précision et l'efficacité du type
    const score = (power * (accuracy/100) * effectiveness * (pp/move.maxPP));
    
    return score;
}

// Fonction pour choisir la meilleure attaque pour l'IA
function chooseBestMove(moves, attacker, defender) {
    let bestScore = -1;
    let bestMove = null;
    let bestIndex = 0;

    moves.forEach((move, index) => {
        const score = evaluateMove(move, attacker, defender);
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
            bestIndex = index;
        }
    });

    return { move: bestMove, index: bestIndex };
}

// Fonction pour exécuter une attaque
async function executeMove(moveIndex, isAlly = true) {
    if (!currentPokemonData.gameStarted) return;
    
    const attacker = isAlly ? currentPokemonData.ally : currentPokemonData.enemy;
    const defender = isAlly ? currentPokemonData.enemy : currentPokemonData.ally;
    const moves = isAlly ? currentPokemonData.moves : currentPokemonData.enemyMoves;
    const attackerPosition = isAlly ? 'left' : 'right';
    const defenderPosition = isAlly ? 'right' : 'left';
    const attackerLevel = isAlly ? currentPokemonData.allyLevel : Math.min(currentPokemonData.currentEnemyId, 10);
    
    if (!moves[moveIndex] || moves[moveIndex].currentPP <= 0) {
        // Choisir une autre attaque si celle-ci n'a plus de PP
        const newMove = chooseBestMove(moves, attacker, defender);
        if (!newMove.move) {
            await displayMessage("Plus aucune attaque disponible !");
            return;
        }
        moveIndex = newMove.index;
    }

    const attackerName = document.getElementById(`pokemon-name-${attackerPosition}`).textContent;
    const defenderName = document.getElementById(`pokemon-name-${defenderPosition}`).textContent;
    
    const move = moves[moveIndex];
    await displayMessage(`${attackerName} utilise ${move.moveData.name} !`);
    
    // Réduire les PP
    move.currentPP--;

    // Calculer et appliquer les dégâts
    const damageResult = calculateDamage(move.moveData, attacker, defender, attackerLevel);
    const damage = damageResult.damage;
    const effectiveness = calculateTypeEffectiveness(
        move.moveData.type.name,
        defender.types.map(t => t.type.name)
    );
    
    // Afficher le message de coup critique
    if (damageResult.isCritical) {
        await displayMessage("Coup critique !");
    }

    // Afficher le message d'efficacité
    if (effectiveness > 1) {
        await displayMessage("C'est super efficace !");
    } else if (effectiveness < 1 && effectiveness > 0) {
        await displayMessage("Ce n'est pas très efficace...");
    } else if (effectiveness === 0) {
        await displayMessage("Ça n'affecte pas le Pokémon adverse...");
    }

    const defenderMaxHP = parseInt(document.getElementById(`max-hp-${defenderPosition}`).textContent);
    let defenderCurrentHP = parseInt(document.getElementById(`current-hp-${defenderPosition}`).textContent);
    
    // Appliquer les dégâts avec animation
    defenderCurrentHP = Math.max(0, defenderCurrentHP - Math.floor(damage * effectiveness));
    await updateHPDisplay(defenderPosition, defenderCurrentHP, defenderMaxHP, Math.floor(damage * effectiveness));
    
    // Mise à jour des statistiques
    currentPokemonData.currentRun.turnsPlayed++;
    
    if (isAlly) {
        currentPokemonData.currentRun.damageDealt += damage;
    } else {
        currentPokemonData.currentRun.damageReceived += damage;
    }

    // Vérifier si le combat est terminé
    if (defenderCurrentHP === 0) {
        await displayMessage(`${defenderName} est K.O. !`);
        if (isAlly) {
            currentPokemonData.score++;
            currentPokemonData.currentRun.pokemonDefeated.push(currentPokemonData.currentEnemyId);
            currentPokemonData.currentEnemyId++;
            
            // Gagner de l'expérience et éventuellement monter de niveau
            await gainExperience();
            
            // Gagner de l'or après la victoire sur un ennemi
            const goldEarned = Math.floor(10 * (1 + currentPokemonData.allyLevel * 0.1));
            earnGold(goldEarned);
            await displayMessage(`Vous avez gagné ${goldEarned} gold !`);
            
            updateProgress();
            await displayMessage(`Victoire ! Score: ${currentPokemonData.score}`);
            
            // Montrer les options après la victoire au lieu de passer automatiquement au prochain combat
            showPostBattleOptions();
        } else {
            endRun(false);
            await displayMessage(`Défaite ! Score final: ${currentPokemonData.score}`);
            currentPokemonData.currentEnemyId = 1;
            currentPokemonData.score = 0;
            currentPokemonData.allyId = null;
            currentPokemonData.allyLevel = 1; // Réinitialiser le niveau
            updateProgress();
            setTimeout(() => showStartScreen(), 2000);
        }
        return;
    }

    // Continuer le combat automatiquement
    setTimeout(() => {
        const nextAttacker = !isAlly;
        const moves = nextAttacker ? currentPokemonData.enemyMoves : currentPokemonData.moves;
        const attacker = nextAttacker ? currentPokemonData.enemy : currentPokemonData.ally;
        const defender = nextAttacker ? currentPokemonData.ally : currentPokemonData.enemy;
        
        const bestMove = chooseBestMove(moves, attacker, defender);
        if (bestMove.move) {
            executeMove(bestMove.index, !isAlly);
        }
    }, currentPokemonData.battleSpeed);
}

// Fonction pour obtenir les détails d'une capacité
async function getMoveDetails(moveUrl) {
    try {
        const response = await fetch(moveUrl);
        const moveData = await response.json();
        return moveData;
    } catch (error) {
        console.error('Erreur lors du chargement de la capacité:', error);
        return null;
    }
}

// Fonction pour appliquer les améliorations permanentes
function applyPermanentUpgrades(pokemon) {
    const upgrades = gameProgress.permanentUpgrades;
    pokemon.stats.forEach(stat => {
        switch(stat.stat.name) {
            case 'hp':
                stat.base_stat += upgrades.maxHpBonus * 5; // +5 HP par niveau d'amélioration
                break;
            case 'attack':
                stat.base_stat += upgrades.attackBonus * 3; // +3 attaque par niveau d'amélioration
                break;
            case 'defense':
                stat.base_stat += upgrades.defenseBonus * 3; // +3 défense par niveau d'amélioration
                break;
        }
    });
    return pokemon;
}

// Fonction pour obtenir un Pokémon avec un ID spécifique
async function getPokemonById(id, position = 'left') {
    try {
        const pokemonResponse = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
        const pokemon = await pokemonResponse.json();

        // Appliquer les améliorations permanentes
        if (position === 'left') {
            applyPermanentUpgrades(pokemon);
        }

        // Mettre à jour l'interface
        const imageElement = document.getElementById(`pokemon-image-${position}`);
        const nameElement = document.getElementById(`pokemon-name-${position}`);

        // Sélectionner le bon sprite en fonction de la position
        let spriteUrl;
        if (position === 'left') {
            spriteUrl = pokemon.sprites.back_default || pokemon.sprites.front_default;
            currentPokemonData.ally = pokemon;
        } else {
            spriteUrl = pokemon.sprites.front_default;
            currentPokemonData.enemy = pokemon;
        }

        // Vérifier si on a bien un sprite
        if (!spriteUrl) {
            console.error(`Pas de sprite disponible pour ${pokemon.name}`);
            spriteUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png';
        }

        // Appliquer le sprite
        imageElement.src = spriteUrl;
        imageElement.onerror = function() {
            console.error(`Erreur de chargement du sprite pour ${pokemon.name}`);
            this.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png';
        };

        // Mettre à jour le nom
        nameElement.textContent = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);

        // Gérer les HP différemment selon la position
        if (position === 'left') {
            // Pour le Pokémon allié, utiliser les HP sauvegardés ou calculer de nouveaux HP
            const baseHP = pokemon.stats.find(stat => stat.stat.name === 'hp').base_stat;
            let currentHP, maxHP;
            
            // Si c'est le premier combat ou après une montée de niveau, recalculer les HP max
            if (currentPokemonData.allyMaxHP === null || currentPokemonData.currentRun.levelUps > 0) {
                maxHP = calculateMaxHP(baseHP, currentPokemonData.allyLevel);
                currentPokemonData.allyMaxHP = maxHP;
                
                // Si première fois, HP actuels = HP max, sinon garder les HP actuels
                if (currentPokemonData.allyCurrHP === null) {
                    currentHP = maxHP;
                    currentPokemonData.allyCurrHP = currentHP;
                } else {
                    // Après une montée de niveau, on ajoute la différence d'HP max aux HP actuels
                    const hpDifference = maxHP - currentPokemonData.allyMaxHP;
                    currentHP = currentPokemonData.allyCurrHP + hpDifference;
                    currentPokemonData.allyCurrHP = currentHP;
                    currentPokemonData.currentRun.levelUps = 0; // Réinitialiser le compteur de montées de niveau
                }
            } else {
                // Utiliser les HP sauvegardés
                currentHP = currentPokemonData.allyCurrHP;
                maxHP = currentPokemonData.allyMaxHP;
            }
            
            // Mettre à jour l'affichage des HP
            document.getElementById(`current-hp-${position}`).textContent = currentHP;
            document.getElementById(`max-hp-${position}`).textContent = maxHP;
            updateHPDisplay(position, currentHP, maxHP);
        } else {
            // Pour l'ennemi, toujours HP pleins
            const baseHP = pokemon.stats.find(stat => stat.stat.name === 'hp').base_stat;
            const level = Math.min(currentPokemonData.currentEnemyId, 10);
            const maxHP = calculateMaxHP(baseHP, level);
            
            // Mettre à jour l'affichage des HP
            document.getElementById(`current-hp-${position}`).textContent = maxHP;
            document.getElementById(`max-hp-${position}`).textContent = maxHP;
            updateHPDisplay(position, maxHP, maxHP);
        }
        
        // Mettre à jour l'affichage du niveau
        if (position === 'left') {
            document.querySelector('.ally .level').textContent = `Nv. ${currentPokemonData.allyLevel}`;
        } else {
            const enemyLevel = Math.min(currentPokemonData.currentEnemyId, 10);
            document.querySelector('.enemy .level').textContent = `Nv. ${enemyLevel}`;
        }

        // Charger les capacités
        if (pokemon.moves.length === 0) {
            console.error('Aucune capacité trouvée pour ce Pokémon');
            return;
        }

        // Prendre 4 capacités aléatoires
        const numMoves = Math.min(4, pokemon.moves.length);
        const selectedMoves = pokemon.moves
            .sort(() => Math.random() - 0.5)
            .slice(0, numMoves);

        // Charger les détails des capacités
        const movesArray = position === 'left' ? currentPokemonData.moves : currentPokemonData.enemyMoves;
        movesArray.length = 0; // Réinitialiser le tableau

        for (let i = 0; i < selectedMoves.length; i++) {
            const moveUrl = selectedMoves[i].move.url;
            try {
                const moveData = await getMoveDetails(moveUrl);
                if (moveData) {
                    movesArray[i] = {
                        moveData: moveData,
                        currentPP: moveData.pp,
                        maxPP: moveData.pp
                    };
                }
            } catch (error) {
                console.error('Erreur lors du chargement des détails de la capacité:', error);
            }
        }
        
        // Appliquer les bonus temporaires si c'est le Pokémon allié
        if (position === 'left') {
            applyTemporaryBonuses(pokemon, position);
        }

    } catch (error) {
        console.error('Erreur:', error);
    }
}

// Fonction pour obtenir la couleur en fonction du type
function getTypeColor(type) {
    const colors = {
        normal: '#A8A878',
        fire: '#F08030',
        water: '#6890F0',
        electric: '#F8D030',
        grass: '#78C850',
        ice: '#98D8D8',
        fighting: '#C03028',
        poison: '#A040A0',
        ground: '#E0C068',
        flying: '#A890F0',
        psychic: '#F85888',
        bug: '#A8B820',
        rock: '#B8A038',
        ghost: '#705898',
        dragon: '#7038F8',
        dark: '#705848',
        steel: '#B8B8D0',
        fairy: '#EE99AC'
    };
    return colors[type] || '#777777';
}

// Fonction pour changer la vitesse du combat
function setBattleSpeed(speed) {
    currentPokemonData.battleSpeed = speed;
}

// Fonction pour sauvegarder la progression
function saveProgress() {
    try {
        localStorage.setItem('pokemonRogueLiteProgress', JSON.stringify(gameProgress));
        console.log('Sauvegarde réussie:', gameProgress);
    } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
    }
}

// Fonction pour charger la progression
function loadProgress() {
    try {
        const savedProgress = localStorage.getItem('pokemonRogueLiteProgress');
        if (savedProgress) {
            const parsedProgress = JSON.parse(savedProgress);
            
            // Fusion des objets pour s'assurer que toutes les propriétés sont présentes
            gameProgress.totalRuns = parsedProgress.totalRuns || 0;
            gameProgress.bestScore = parsedProgress.bestScore || 0;
            gameProgress.totalVictories = parsedProgress.totalVictories || 0;
            gameProgress.gold = parsedProgress.gold || 0;
            
            // Assigner les starters débloqués
            if (parsedProgress.unlockedStarters) {
                Object.keys(parsedProgress.unlockedStarters).forEach(key => {
                    if (gameProgress.unlockedStarters.hasOwnProperty(key)) {
                        gameProgress.unlockedStarters[key] = parsedProgress.unlockedStarters[key];
                    }
                });
            }
            
            // Assigner les améliorations permanentes
            if (parsedProgress.permanentUpgrades) {
                Object.keys(parsedProgress.permanentUpgrades).forEach(key => {
                    if (gameProgress.permanentUpgrades.hasOwnProperty(key)) {
                        gameProgress.permanentUpgrades[key] = parsedProgress.permanentUpgrades[key];
                    }
                });
            }
            
            console.log('Données chargées avec succès:', gameProgress);
        } else {
            console.log('Aucune sauvegarde trouvée, utilisation des valeurs par défaut');
        }
    } catch (error) {
        console.error('Erreur lors du chargement:', error);
    }
}

// Fonction pour gagner de l'or
function earnGold(amount) {
    gameProgress.gold += amount;
    saveProgress();
    
    // Mettre à jour l'affichage des Gold dans toutes les interfaces
    if (document.getElementById('player-gold')) {
        document.getElementById('player-gold').textContent = gameProgress.gold;
    }
    if (document.getElementById('battle-gold')) {
        document.getElementById('battle-gold').textContent = gameProgress.gold;
    }
    
    // Afficher une notification d'or gagné
    const goldNotification = document.createElement('div');
    goldNotification.className = 'gold-notification';
    goldNotification.innerHTML = `<span class="gold-icon">💰</span> +${amount} Gold`;
    document.body.appendChild(goldNotification);
    
    // Animation de la notification
    setTimeout(() => {
        goldNotification.classList.add('show');
        setTimeout(() => {
            goldNotification.classList.remove('show');
            setTimeout(() => {
                goldNotification.remove();
            }, 500);
        }, 2000);
    }, 100);
}

// Fonction pour acheter des améliorations permanentes
function purchaseUpgrade(upgradeType) {
    const costs = {
        maxHpBonus: 100,
        attackBonus: 150,
        defenseBonus: 150,
        criticalChance: 200
    };

    if (gameProgress.gold >= costs[upgradeType]) {
        gameProgress.gold -= costs[upgradeType];
        gameProgress.permanentUpgrades[upgradeType]++;
        saveProgress();
        
        // Mettre à jour l'affichage de l'or dans toutes les interfaces
        if (document.getElementById('player-gold')) {
            document.getElementById('player-gold').textContent = gameProgress.gold;
        }
        if (document.getElementById('battle-gold')) {
            document.getElementById('battle-gold').textContent = gameProgress.gold;
        }
        
        // Mettre à jour l'affichage des niveaux d'amélioration
        document.getElementById(`${upgradeType}-upgrade-level`).textContent = `Niv. ${gameProgress.permanentUpgrades[upgradeType]}`;
        
        return true;
    }
    
    // Afficher un message si pas assez d'or
    const insufficientGoldMsg = document.createElement('div');
    insufficientGoldMsg.className = 'gold-notification insufficient';
    insufficientGoldMsg.innerHTML = `<span class="gold-icon">⚠️</span> Or insuffisant`;
    document.body.appendChild(insufficientGoldMsg);
    
    setTimeout(() => {
        insufficientGoldMsg.classList.add('show');
        setTimeout(() => {
            insufficientGoldMsg.classList.remove('show');
            setTimeout(() => {
                insufficientGoldMsg.remove();
            }, 500);
        }, 2000);
    }, 100);
    
    return false;
}

// Fonction pour débloquer un nouveau Pokémon
function unlockPokemon(pokemonId) {
    if (pokemonId in gameProgress.unlockedStarters) {
        gameProgress.unlockedStarters[pokemonId] = true;
        saveProgress();
        return true;
    }
    return false;
}

// Fonction pour vérifier les conditions de déblocage
function checkUnlockConditions() {
    // Débloquer Pikachu après 10 victoires
    if (gameProgress.totalVictories >= 10) {
        unlockPokemon(25);
    }
    // Débloquer Évoli après 25 victoires
    if (gameProgress.totalVictories >= 25) {
        unlockPokemon(133);
    }
    // Débloquer Germignon après 50 victoires
    if (gameProgress.totalVictories >= 50) {
        unlockPokemon(152);
    }
}

// Fonction pour terminer une run
function endRun(wasVictorious) {
    if (wasVictorious) {
        gameProgress.totalVictories++;
        
        // Calculer l'or gagné - base sur le score et bonus selon le niveau
        const goldEarned = Math.floor(currentPokemonData.score * 15 * (1 + currentPokemonData.allyLevel * 0.1));
        earnGold(goldEarned);
    }
    
    gameProgress.totalRuns++;
    gameProgress.bestScore = Math.max(gameProgress.bestScore, currentPokemonData.score);
    
    checkUnlockConditions();
    saveProgress();
    
    console.log('Fin de run - État actuel:', gameProgress);
}

// Fonction pour démarrer le jeu avec le Pokémon choisi
function startGameWithPokemon(pokemonId) {
    if (!gameProgress.unlockedStarters[pokemonId]) {
        displayMessage("Ce Pokémon n'est pas encore débloqué !");
        return;
    }
    
    currentPokemonData.allyId = pokemonId;
    currentPokemonData.allyLevel = 1;
    currentPokemonData.allyCurrHP = null; // Réinitialiser les HP pour une nouvelle partie
    currentPokemonData.allyMaxHP = null;
    currentPokemonData.currentRun = {
        temporaryUpgrades: [],
        pokemonDefeated: [],
        turnsPlayed: 0,
        criticalHits: 0,
        damageDealt: 0,
        damageReceived: 0,
        experienceGained: 0,
        levelUps: 0
    };
    
    // Afficher l'écran de sélection de bonus au lieu de démarrer directement le combat
    showBonusSelection();
}

// Fonction pour afficher l'écran de sélection de bonus
function showBonusSelection() {
    const startScreen = document.getElementById('start-screen');
    
    // Créer l'écran de sélection de bonus s'il n'existe pas déjà
    let bonusScreen = document.getElementById('bonus-screen');
    if (!bonusScreen) {
        bonusScreen = document.createElement('div');
        bonusScreen.id = 'bonus-screen';
        bonusScreen.className = 'bonus-screen';
        
        // Ajouter le contenu à l'écran de bonus
        bonusScreen.innerHTML = `
            <div class="bonus-container">
                <h2 class="bonus-title">Choisissez un bonus pour cette run</h2>
                <div class="bonus-options" id="bonus-options">
                    <!-- Les options de bonus seront générées dynamiquement -->
                </div>
            </div>
        `;
        
        // Ajouter l'écran au body
        document.body.appendChild(bonusScreen);
    }
    
    // Sélectionner 3 bonus aléatoires à proposer
    const shuffledBonuses = [...runBonuses].sort(() => Math.random() - 0.5);
    const selectedBonuses = shuffledBonuses.slice(0, 3);
    
    // Mettre à jour les options de bonus
    const bonusOptions = document.getElementById('bonus-options');
    bonusOptions.innerHTML = '';
    
    selectedBonuses.forEach(bonus => {
        const bonusElement = document.createElement('div');
        bonusElement.className = 'bonus-option';
        bonusElement.dataset.bonusId = bonus.id;
        
        bonusElement.innerHTML = `
            <h3>${bonus.name}</h3>
            <p>${bonus.description}</p>
        `;
        
        // Ajouter l'événement de clic
        bonusElement.addEventListener('click', () => {
            selectBonus(bonus);
        });
        
        bonusOptions.appendChild(bonusElement);
    });
    
    // Cacher l'écran de démarrage et montrer l'écran de bonus
    startScreen.style.opacity = '0';
    setTimeout(() => {
        startScreen.style.display = 'none';
        bonusScreen.style.display = 'flex';
        setTimeout(() => {
            bonusScreen.style.opacity = '1';
        }, 50);
    }, 500);
}

// Fonction pour sélectionner un bonus et démarrer le combat
function selectBonus(bonus) {
    // Ajouter le bonus sélectionné aux améliorations temporaires
    currentPokemonData.currentRun.temporaryUpgrades.push(bonus);
    
    // Cacher l'écran de bonus
    const bonusScreen = document.getElementById('bonus-screen');
    bonusScreen.style.opacity = '0';
    
    setTimeout(() => {
        bonusScreen.style.display = 'none';
        
        // Démarrer le combat
        startBattle();
    }, 500);
}

// Fonction pour appliquer les bonus temporaires
function applyTemporaryBonuses(pokemon, position) {
    if (position !== 'left' || !currentPokemonData.currentRun.temporaryUpgrades.length) {
        return pokemon; // Retourner le Pokémon sans modification s'il n'est pas allié ou pas de bonus
    }
    
    // Appliquer chaque bonus
    currentPokemonData.currentRun.temporaryUpgrades.forEach(bonus => {
        const effect = bonus.effect(pokemon);
        
        if (effect.stat === 'hp') {
            // Bonus de HP
            const currentHP = parseInt(document.getElementById('current-hp-left').textContent);
            const maxHP = parseInt(document.getElementById('max-hp-left').textContent);
            const newMaxHP = maxHP + effect.value;
            
            document.getElementById('current-hp-left').textContent = currentHP + effect.value;
            document.getElementById('max-hp-left').textContent = newMaxHP;
            updateHPDisplay('left', currentHP + effect.value, newMaxHP);
        } 
        else if (effect.stat === 'pp') {
            // Bonus de PP
            currentPokemonData.moves.forEach(move => {
                if (move && move.moveData) {
                    move.currentPP += effect.value;
                    move.maxPP += effect.value;
                }
            });
        }
        // Les autres types de bonus sont appliqués directement lors du calcul des dégâts
    });
    
    // Mettre à jour l'affichage des bonus actifs
    updateActiveBonuses();
    
    return pokemon;
}

// Fonction pour afficher l'écran de démarrage
function showStartScreen() {
    const startScreen = document.getElementById('start-screen');
    const battleScene = document.getElementById('battle-scene');
    
    battleScene.style.opacity = '0';
    setTimeout(() => {
        battleScene.style.display = 'none';
        startScreen.style.display = 'flex';
        startScreen.style.opacity = '1';
        
        // Mettre à jour l'affichage des statistiques
        updateStats();
        
        // Mettre à jour l'état de déverrouillage des Pokémon
        const starterPokemon = document.querySelectorAll('.starter-pokemon');
        starterPokemon.forEach(pokemon => {
            const pokemonId = parseInt(pokemon.dataset.pokemonId);
            if (gameProgress.unlockedStarters[pokemonId]) {
                pokemon.classList.remove('locked');
                const lockOverlay = pokemon.querySelector('.lock-overlay');
                if (lockOverlay) lockOverlay.style.display = 'none';
            }
        });
    }, 500);
}

// Fonction pour mettre à jour l'affichage des statistiques
function updateStats() {
    // Mettre à jour l'affichage des statistiques
    if (document.getElementById('best-score')) {
        document.getElementById('best-score').textContent = gameProgress.bestScore;
    }
    if (document.getElementById('total-victories')) {
        document.getElementById('total-victories').textContent = gameProgress.totalVictories;
    }
    if (document.getElementById('player-gold')) {
        document.getElementById('player-gold').textContent = gameProgress.gold;
    }
    
    // Mettre à jour l'affichage des niveaux d'amélioration
    if (document.getElementById('maxHpBonus-upgrade-level')) {
        document.getElementById('maxHpBonus-upgrade-level').textContent = `Niv. ${gameProgress.permanentUpgrades.maxHpBonus}`;
    }
    if (document.getElementById('attackBonus-upgrade-level')) {
        document.getElementById('attackBonus-upgrade-level').textContent = `Niv. ${gameProgress.permanentUpgrades.attackBonus}`;
    }
    if (document.getElementById('defenseBonus-upgrade-level')) {
        document.getElementById('defenseBonus-upgrade-level').textContent = `Niv. ${gameProgress.permanentUpgrades.defenseBonus}`;
    }
    if (document.getElementById('criticalChance-upgrade-level')) {
        document.getElementById('criticalChance-upgrade-level').textContent = `Niv. ${gameProgress.permanentUpgrades.criticalChance}`;
    }
}

// Fonction pour afficher les options après un combat
function showPostBattleOptions() {
    // Créer un overlay pour le choix
    const overlay = document.createElement('div');
    overlay.className = 'post-battle-overlay';
    
    // Créer la boîte de dialogue
    const dialogBox = document.createElement('div');
    dialogBox.className = 'post-battle-dialog';
    
    // Titre
    const title = document.createElement('h2');
    title.textContent = 'Que voulez-vous faire maintenant ?';
    dialogBox.appendChild(title);
    
    // Options aléatoires (parfois certaines options apparaissent, parfois non)
    const options = [];
    
    // L'option Combat est toujours disponible
    options.push({
        name: 'Combat',
        description: 'Continuer vers le prochain combat',
        action: () => {
            document.body.removeChild(overlay);
            startBattle();
        }
    });
    
    // L'option Boutique apparaît avec une probabilité de 60%
    if (Math.random() < 0.6) {
        options.push({
            name: 'Boutique',
            description: 'Acheter des objets et des améliorations',
            action: () => {
                document.body.removeChild(overlay);
                showShop();
            }
        });
    }
    
    // L'option Événement aléatoire apparaît avec une probabilité de 50%
    if (Math.random() < 0.5) {
        options.push({
            name: 'Événement',
            description: 'Tenter votre chance avec un événement aléatoire',
            action: () => {
                document.body.removeChild(overlay);
                triggerRandomEvent();
            }
        });
    }
    
    // L'option Fuir est toujours disponible
    options.push({
        name: 'Fuir',
        description: 'Mettre fin à cette run et revenir à l\'écran d\'accueil',
        action: () => {
            document.body.removeChild(overlay);
            endRun(true); // Considéré comme une victoire car le joueur a choisi de terminer
            showStartScreen();
        }
    });
    
    // Créer les boutons pour chaque option
    options.forEach(option => {
        const button = document.createElement('div');
        button.className = 'post-battle-option';
        
        const optionName = document.createElement('h3');
        optionName.textContent = option.name;
        
        const optionDesc = document.createElement('p');
        optionDesc.textContent = option.description;
        
        button.appendChild(optionName);
        button.appendChild(optionDesc);
        
        button.addEventListener('click', option.action);
        
        dialogBox.appendChild(button);
    });
    
    overlay.appendChild(dialogBox);
    document.body.appendChild(overlay);
}

// Fonction pour afficher la boutique
function showShop() {
    // Créer un overlay pour la boutique
    const overlay = document.createElement('div');
    overlay.className = 'shop-overlay';
    
    // Créer la boîte de la boutique
    const shopBox = document.createElement('div');
    shopBox.className = 'shop-dialog';
    
    // Titre
    const title = document.createElement('h2');
    title.textContent = 'Boutique';
    shopBox.appendChild(title);
    
    // Afficher l'or du joueur
    const goldDisplay = document.createElement('div');
    goldDisplay.className = 'shop-gold';
    goldDisplay.innerHTML = `<span class="gold-icon">💰</span> ${gameProgress.gold} Gold`;
    shopBox.appendChild(goldDisplay);
    
    // Liste des articles
    const items = [
        {
            name: 'Potion',
            description: 'Restaure 20 HP',
            cost: 30,
            action: () => {
                if (gameProgress.gold >= 30) {
                    gameProgress.gold -= 30;
                    const currentHP = parseInt(document.getElementById('current-hp-left').textContent);
                    const maxHP = parseInt(document.getElementById('max-hp-left').textContent);
                    const newHP = Math.min(currentHP + 20, maxHP);
                    document.getElementById('current-hp-left').textContent = newHP;
                    currentPokemonData.allyCurrHP = newHP;
                    updateHPDisplay('left', newHP, maxHP);
                    
                    // Mettre à jour l'affichage de l'or
                    goldDisplay.innerHTML = `<span class="gold-icon">💰</span> ${gameProgress.gold} Gold`;
                    saveProgress();
                    
                    // Afficher un message de confirmation
                    showShopMessage('Vous avez utilisé une Potion et récupéré 20 HP!');
                } else {
                    showShopMessage('Vous n\'avez pas assez d\'or!', true);
                }
            }
        },
        {
            name: 'Super Potion',
            description: 'Restaure 50 HP',
            cost: 70,
            action: () => {
                if (gameProgress.gold >= 70) {
                    gameProgress.gold -= 70;
                    const currentHP = parseInt(document.getElementById('current-hp-left').textContent);
                    const maxHP = parseInt(document.getElementById('max-hp-left').textContent);
                    const newHP = Math.min(currentHP + 50, maxHP);
                    document.getElementById('current-hp-left').textContent = newHP;
                    currentPokemonData.allyCurrHP = newHP;
                    updateHPDisplay('left', newHP, maxHP);
                    
                    // Mettre à jour l'affichage de l'or
                    goldDisplay.innerHTML = `<span class="gold-icon">💰</span> ${gameProgress.gold} Gold`;
                    saveProgress();
                    
                    // Afficher un message de confirmation
                    showShopMessage('Vous avez utilisé une Super Potion et récupéré 50 HP!');
                } else {
                    showShopMessage('Vous n\'avez pas assez d\'or!', true);
                }
            }
        },
        {
            name: 'Amélioration d\'Attaque',
            description: '+10% d\'attaque pour cette run',
            cost: 50,
            action: () => {
                if (gameProgress.gold >= 50) {
                    gameProgress.gold -= 50;
                    
                    // Ajouter un bonus temporaire d'attaque
                    const attackBonus = {
                        id: 'attack_boost_temp',
                        name: 'Force+',
                        description: 'Attaque +10%',
                        effect: (pokemon) => {
                            const baseAttack = pokemon.stats.find(stat => stat.stat.name === 'attack').base_stat;
                            const bonusAttack = Math.floor(baseAttack * 0.1);
                            return { stat: 'attack', value: bonusAttack };
                        }
                    };
                    
                    currentPokemonData.currentRun.temporaryUpgrades.push(attackBonus);
                    updateActiveBonuses();
                    
                    // Mettre à jour l'affichage de l'or
                    goldDisplay.innerHTML = `<span class="gold-icon">💰</span> ${gameProgress.gold} Gold`;
                    saveProgress();
                    
                    // Afficher un message de confirmation
                    showShopMessage('Vous avez amélioré votre attaque de 10%!');
                } else {
                    showShopMessage('Vous n\'avez pas assez d\'or!', true);
                }
            }
        },
        {
            name: 'Guérison Complète',
            description: 'Restaure tous vos HP',
            cost: 100,
            action: () => {
                if (gameProgress.gold >= 100) {
                    gameProgress.gold -= 100;
                    const maxHP = parseInt(document.getElementById('max-hp-left').textContent);
                    document.getElementById('current-hp-left').textContent = maxHP;
                    currentPokemonData.allyCurrHP = maxHP;
                    updateHPDisplay('left', maxHP, maxHP);
                    
                    // Mettre à jour l'affichage de l'or
                    goldDisplay.innerHTML = `<span class="gold-icon">💰</span> ${gameProgress.gold} Gold`;
                    saveProgress();
                    
                    // Afficher un message de confirmation
                    showShopMessage('Vous avez restauré tous vos HP!');
                } else {
                    showShopMessage('Vous n\'avez pas assez d\'or!', true);
                }
            }
        }
    ];
    
    // Créer les boutons pour chaque article
    items.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'shop-item';
        
        const itemName = document.createElement('h3');
        itemName.textContent = item.name;
        
        const itemDesc = document.createElement('p');
        itemDesc.textContent = item.description;
        
        const itemCost = document.createElement('div');
        itemCost.className = 'item-cost';
        itemCost.innerHTML = `<span class="gold-cost">${item.cost} <span class="gold-icon">💰</span></span>`;
        
        itemElement.appendChild(itemName);
        itemElement.appendChild(itemDesc);
        itemElement.appendChild(itemCost);
        
        itemElement.addEventListener('click', item.action);
        
        shopBox.appendChild(itemElement);
    });
    
    // Bouton pour quitter la boutique
    const exitButton = document.createElement('div');
    exitButton.className = 'shop-exit';
    exitButton.textContent = 'Continuer';
    exitButton.addEventListener('click', () => {
        document.body.removeChild(overlay);
        startBattle(); // Continuer vers le prochain combat
    });
    
    shopBox.appendChild(exitButton);
    
    overlay.appendChild(shopBox);
    document.body.appendChild(overlay);
}

// Fonction pour afficher des messages dans la boutique
function showShopMessage(message, isError = false) {
    const messageElement = document.createElement('div');
    messageElement.className = `shop-message ${isError ? 'error' : 'success'}`;
    messageElement.textContent = message;
    
    document.body.appendChild(messageElement);
    
    // Animation d'apparition
    setTimeout(() => {
        messageElement.classList.add('show');
        
        // Disparition après 3 secondes
        setTimeout(() => {
            messageElement.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(messageElement);
            }, 500);
        }, 3000);
    }, 100);
}

// Fonction pour déclencher un événement aléatoire
function triggerRandomEvent() {
    // Créer un overlay pour l'événement
    const overlay = document.createElement('div');
    overlay.className = 'event-overlay';
    
    // Créer la boîte de l'événement
    const eventBox = document.createElement('div');
    eventBox.className = 'event-dialog';
    
    // Liste des événements possibles
    const events = [
        {
            name: 'Trésor trouvé!',
            description: 'Vous avez trouvé un petit trésor caché!',
            effect: () => {
                const goldAmount = Math.floor(30 + Math.random() * 70); // Entre 30 et 100 d'or
                earnGold(goldAmount);
                return `Vous avez gagné ${goldAmount} Gold!`;
            }
        },
        {
            name: 'Pokémon sauvage agressif',
            description: 'Un Pokémon sauvage vous attaque par surprise!',
            effect: () => {
                const damage = Math.floor(5 + Math.random() * 15); // Entre 5 et 20 de dégâts
                const currentHP = parseInt(document.getElementById('current-hp-left').textContent);
                const maxHP = parseInt(document.getElementById('max-hp-left').textContent);
                const newHP = Math.max(1, currentHP - damage); // Ne pas tuer le joueur
                document.getElementById('current-hp-left').textContent = newHP;
                currentPokemonData.allyCurrHP = newHP;
                updateHPDisplay('left', newHP, maxHP);
                return `Vous perdez ${damage} HP!`;
            }
        },
        {
            name: 'Source guérisseuse',
            description: 'Vous trouvez une source aux propriétés curatives!',
            effect: () => {
                const healing = Math.floor(15 + Math.random() * 35); // Entre 15 et 50 HP récupérés
                const currentHP = parseInt(document.getElementById('current-hp-left').textContent);
                const maxHP = parseInt(document.getElementById('max-hp-left').textContent);
                const newHP = Math.min(maxHP, currentHP + healing);
                document.getElementById('current-hp-left').textContent = newHP;
                currentPokemonData.allyCurrHP = newHP;
                updateHPDisplay('left', newHP, maxHP);
                return `Vous récupérez ${healing} HP!`;
            }
        },
        {
            name: 'Entraînement rapide',
            description: 'Vous prenez le temps d\'entraîner votre Pokémon!',
            effect: () => {
                const expGained = 100 + Math.floor(Math.random() * 150); // Entre 100 et 250 EXP
                currentPokemonData.currentRun.experienceGained += expGained;
                checkLevelUp(); // Vérifier si le Pokémon peut monter de niveau
                return `Vous gagnez ${expGained} points d'expérience!`;
            }
        },
        {
            name: 'Mentor Pokémon',
            description: 'Un vieux dresseur vous enseigne une technique spéciale!',
            effect: () => {
                // Ajouter un bonus temporaire de critique
                const critBonus = {
                    id: 'crit_chance_temp',
                    name: 'Précision+',
                    description: 'Critique +8%',
                    effect: () => {
                        return { stat: 'crit', value: 8 };
                    }
                };
                
                currentPokemonData.currentRun.temporaryUpgrades.push(critBonus);
                updateActiveBonuses();
                
                return 'Votre chance de coup critique augmente de 8%!';
            }
        },
        {
            name: 'Boss Surprise!',
            description: 'Vous tombez nez à nez avec un Pokémon particulièrement puissant!',
            effect: () => {
                // Augmenter l'ID de l'ennemi suivant pour affronter un Pokémon plus fort
                currentPokemonData.currentEnemyId += 5;
                
                return 'Le prochain combat sera beaucoup plus difficile!';
            }
        },
        {
            name: 'Guérison miraculeuse',
            description: 'Une lumière étrange enveloppe votre Pokémon!',
            effect: () => {
                // Soins complets
                const maxHP = parseInt(document.getElementById('max-hp-left').textContent);
                document.getElementById('current-hp-left').textContent = maxHP;
                currentPokemonData.allyCurrHP = maxHP;
                updateHPDisplay('left', maxHP, maxHP);
                
                return 'Votre Pokémon est complètement guéri!';
            }
        }
    ];
    
    // Sélectionner un événement aléatoire
    const event = events[Math.floor(Math.random() * events.length)];
    
    // Titre de l'événement
    const title = document.createElement('h2');
    title.textContent = event.name;
    eventBox.appendChild(title);
    
    // Description de l'événement
    const description = document.createElement('p');
    description.textContent = event.description;
    eventBox.appendChild(description);
    
    // Appliquer l'effet de l'événement
    const effectResult = event.effect();
    
    // Résultat de l'événement
    const result = document.createElement('p');
    result.className = 'event-result';
    result.textContent = effectResult;
    eventBox.appendChild(result);
    
    // Bouton pour continuer
    const continueButton = document.createElement('div');
    continueButton.className = 'event-continue';
    continueButton.textContent = 'Continuer';
    continueButton.addEventListener('click', () => {
        document.body.removeChild(overlay);
        startBattle(); // Continuer vers le prochain combat
    });
    
    eventBox.appendChild(continueButton);
    
    overlay.appendChild(eventBox);
    document.body.appendChild(overlay);
}

// Initialisation au chargement de la page
window.onload = function() {
    // Charger les données sauvegardées
    loadProgress();
    
    console.log('Données chargées:', gameProgress);
    
    // Ajouter les styles de transition
    const startScreen = document.getElementById('start-screen');
    const battleScene = document.getElementById('battle-scene');
    
    startScreen.style.transition = 'opacity 0.5s ease';
    startScreen.style.opacity = '1';
    
    battleScene.style.transition = 'opacity 0.5s ease';
    battleScene.style.opacity = '0';
    battleScene.style.display = 'none';
    
    // Mettre à jour l'affichage des statistiques
    updateStats();

    // Ajouter les contrôles de vitesse
    const controls = document.createElement('div');
    controls.className = 'speed-controls';
    controls.innerHTML = `
        <button onclick="setBattleSpeed(2000)">Lent</button>
        <button onclick="setBattleSpeed(1500)">Normal</button>
        <button onclick="setBattleSpeed(750)">Rapide</button>
    `;
    document.body.appendChild(controls);

    // Ajouter les événements de clic sur les Pokémon de départ
    const starterPokemon = document.querySelectorAll('.starter-pokemon');
    starterPokemon.forEach(pokemon => {
        pokemon.addEventListener('click', function() {
            const pokemonId = parseInt(this.dataset.pokemonId);
            startGameWithPokemon(pokemonId);
        });

        // Ajouter un effet de survol
        pokemon.addEventListener('mouseover', function() {
            this.style.transform = 'translateY(-5px)';
        });

        pokemon.addEventListener('mouseout', function() {
            this.style.transform = 'translateY(0)';
        });
    });
}; 