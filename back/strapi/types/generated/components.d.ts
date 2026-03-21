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
    foilMode: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    foilScale: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<4>;
    foilSpeed: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<1>;
    holoIntensity: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<1.2>;
    sensitivity: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0.3>;
    targetColor: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'#cc3333'>;
    tolerance: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0.2>;
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
    isNarration: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    name: Schema.Attribute.String;
    position: Schema.Attribute.Enumeration<['left', 'right']> &
      Schema.Attribute.DefaultTo<'left'>;
    sentence: Schema.Attribute.Text & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'foil.layer': FoilLayer;
      'story.dialogue': StoryDialogue;
    }
  }
}
