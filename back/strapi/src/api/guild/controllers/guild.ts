// @ts-nocheck
// @ts-nocheck
// @ts-nocheck
// @ts-nocheck
// @ts-nocheck
// @ts-nocheck
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::guild.guild' as any, ({ strapi }: { strapi: any }) => ({
  async join(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    const { id } = ctx.params;

    // Check if guild exists
    const guild = await (strapi as any).entityService.findOne('api::guild.guild' as any, id, {
      populate: ['members']
    }) as any;

    if (!guild) return ctx.notFound('Guild not found');

    // Check if already a member
    const isMember = guild.members?.some((member: any) => member.id === user.id);
    if (isMember) {
      return ctx.badRequest('You are already a member of this guild');
    }

    // Add member
    const updatedGuild = await (strapi as any).entityService.update('api::guild.guild' as any, id, {
      data: {
        members: [...(guild.members || []).map((m: any) => m.id), user.id]
      }
    });

    return { data: updatedGuild, message: 'Successfully joined the guild' };
  },

  async leave(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    const { id } = ctx.params;

    const guild = await (strapi as any).entityService.findOne('api::guild.guild' as any, id, {
      populate: ['members']
    }) as any;

    if (!guild) return ctx.notFound('Guild not found');

    const updatedGuild = await (strapi as any).entityService.update('api::guild.guild' as any, id, {
      data: {
        members: (guild.members || []).map((m: any) => m.id).filter((memberId: any) => memberId !== user.id)
      }
    });

    return { data: updatedGuild, message: 'Successfully left the guild' };
  }
}));
