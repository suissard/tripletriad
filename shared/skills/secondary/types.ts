export interface SecondarySkillDef {
  id: string;
  primitiveType: string;
  name: string;
  description: string;
  effectType?: string;
  condition: (skillConfig: any) => boolean;
}
