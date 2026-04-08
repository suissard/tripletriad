import type { Schema, Struct } from '@strapi/strapi';

export interface FoilLayer extends Struct.ComponentSchema {
  collectionName: 'components_foil_layers';
  info: {
    description: 'A single holographic foil layer configuration';
    displayName: 'Layer';
  };
  attributes: {
    drawData: Schema.Attribute.Text;
    enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    foilAngle: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    foilColor: Schema.Attribute.String & Schema.Attribute.DefaultTo<'#ffffff'>;
    foilDirection: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    foilMode: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    foilScale: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<4>;
    foilSpeed: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<1>;
    holoIntensity: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<1.2>;
    noiseIntensity: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0>;
    parallaxDepth: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<1.5>;
    patternData: Schema.Attribute.Text;
    sensitivity: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0.3>;
    targetColor: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'#cc3333'>;
    tolerance: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0.2>;
    useRainbow: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
  };
}

export interface GameSkill extends Struct.ComponentSchema {
  collectionName: 'components_game_skills';
  info: {
    description: "Comp\u00E9tence d'une carte (Growing, Decrease, Heal, Death, etc.)";
    displayName: 'skill';
  };
  attributes: {
    target: Schema.Attribute.String;
    type: Schema.Attribute.Enumeration<
      ['growing', 'decrease', 'heal', 'death', 'turn']
    > &
      Schema.Attribute.Required;
    value: Schema.Attribute.Integer & Schema.Attribute.Required;
  };
}

export interface StoryChoiceCondition extends Struct.ComponentSchema {
  collectionName: 'components_story_choice_conditions';
  info: {
    description: 'Condition required to unlock a choice option';
    displayName: 'Choice Condition';
  };
  attributes: {
    type: Schema.Attribute.Enumeration<
      [
        'hasCard',
        'hasCoin',
        'hasGem',
        'hasVisitedSituation',
        'hasWonBattle',
        'hasLostBattle',
        'hasItem',
      ]
    > &
      Schema.Attribute.Required;
    value: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface StoryChoiceOption extends Struct.ComponentSchema {
  collectionName: 'components_story_choice_options';
  info: {
    description: 'An option within a multiple-choice situation';
    displayName: 'Choice Option';
  };
  attributes: {
    conditions: Schema.Attribute.Component<'story.choice-condition', true>;
    nextSituationId: Schema.Attribute.String & Schema.Attribute.Required;
    text: Schema.Attribute.String & Schema.Attribute.Required;
    variables: Schema.Attribute.JSON;
  };
}

export interface StoryDialogue extends Struct.ComponentSchema {
  collectionName: 'components_story_dialogues';
  info: {
    description: 'A single line of dialogue from a character';
    displayName: 'Dialogue';
  };
  attributes: {
    card: Schema.Attribute.Relation<'oneToOne', 'api::card.card'>;
    color: Schema.Attribute.String;
    isNarration: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    name: Schema.Attribute.String;
    position: Schema.Attribute.Enumeration<['left', 'right']> &
      Schema.Attribute.DefaultTo<'left'>;
    sentence: Schema.Attribute.Text & Schema.Attribute.Required;
  };
}

export interface StorySituationBattle extends Struct.ComponentSchema {
  collectionName: 'components_story_situation_battles';
  info: {
    description: 'A battle with branching outcomes';
    displayName: 'Situation: Battle';
  };
  attributes: {
    color: Schema.Attribute.String;
    enemyDeck: Schema.Attribute.Relation<'oneToOne', 'api::deck.deck'>;
    onLoseSituationId: Schema.Attribute.String;
    onWinSituationId: Schema.Attribute.String & Schema.Attribute.Required;
    playerDeck: Schema.Attribute.Relation<'oneToOne', 'api::deck.deck'>;
    situationId: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface StorySituationChoice extends Struct.ComponentSchema {
  collectionName: 'components_story_situation_choices';
  info: {
    description: 'A situation where the player makes a choice';
    displayName: 'Situation: Choice';
  };
  attributes: {
    color: Schema.Attribute.String;
    options: Schema.Attribute.Component<'story.choice-option', true>;
    situationId: Schema.Attribute.String & Schema.Attribute.Required;
    text: Schema.Attribute.Text & Schema.Attribute.Required;
  };
}

export interface StorySituationDialogue extends Struct.ComponentSchema {
  collectionName: 'components_story_situation_dialogues';
  info: {
    description: 'A dialogue sequence before moving to the next situation';
    displayName: 'Situation: Dialogue';
  };
  attributes: {
    color: Schema.Attribute.String;
    dialogues: Schema.Attribute.Component<'story.dialogue', true>;
    nextSituationId: Schema.Attribute.String;
    situationId: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface StorySituationGameOver extends Struct.ComponentSchema {
  collectionName: 'components_story_situation_game_overs';
  info: {
    description: 'Ends the current step in failure';
    displayName: 'Situation: Game Over';
  };
  attributes: {
    color: Schema.Attribute.String;
    message: Schema.Attribute.String & Schema.Attribute.Required;
    situationId: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface StorySituationReward extends Struct.ComponentSchema {
  collectionName: 'components_story_situation_rewards';
  info: {
    description: 'A situation that gives the player a reward';
    displayName: 'Situation: Reward';
  };
  attributes: {
    color: Schema.Attribute.String;
    nextSituationId: Schema.Attribute.String;
    rewardCards: Schema.Attribute.Relation<'oneToMany', 'api::card.card'>;
    rewardCoins: Schema.Attribute.Integer;
    rewardGems: Schema.Attribute.Integer;
    situationId: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface StorySituationSuccess extends Struct.ComponentSchema {
  collectionName: 'components_story_situation_successes';
  info: {
    description: 'Ends the current step in success';
    displayName: 'Situation: Success';
  };
  attributes: {
    color: Schema.Attribute.String;
    message: Schema.Attribute.String & Schema.Attribute.Required;
    situationId: Schema.Attribute.String & Schema.Attribute.Required;
    variables: Schema.Attribute.JSON;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'foil.layer': FoilLayer;
      'game.skill': GameSkill;
      'story.choice-condition': StoryChoiceCondition;
      'story.choice-option': StoryChoiceOption;
      'story.dialogue': StoryDialogue;
      'story.situation-battle': StorySituationBattle;
      'story.situation-choice': StorySituationChoice;
      'story.situation-dialogue': StorySituationDialogue;
      'story.situation-game-over': StorySituationGameOver;
      'story.situation-reward': StorySituationReward;
      'story.situation-success': StorySituationSuccess;
    }
  }
}
