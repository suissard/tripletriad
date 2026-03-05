import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::match.match', ({ strapi }) => ({
    async createMatch(ctx) {
        const { uuid, offer } = ctx.request.body;

        if (!uuid || !offer) {
            return ctx.badRequest('uuid and offer are required');
        }

        const newMatch = await strapi.db.query('api::match.match').create({
            data: {
                uuid: uuid,
                offer: offer
            }
        });

        return ctx.send({ data: newMatch });
    },

    async findByUuid(ctx) {
        const { uuid } = ctx.params;

        const match = await strapi.db.query('api::match.match').findOne({
            where: { uuid: uuid }
        });

        if (!match) {
            return ctx.notFound('Match not found');
        }

        return ctx.send({ data: match });
    },

    async updateByUuid(ctx) {
        const { uuid } = ctx.params;
        const { answer } = ctx.request.body;

        const match = await strapi.db.query('api::match.match').findOne({
            where: { uuid: uuid }
        });

        if (!match) {
            return ctx.notFound('Match not found');
        }

        const updatedMatch = await strapi.db.query('api::match.match').update({
            where: { id: match.id },
            data: {
                answer: answer
            }
        });

        return ctx.send({ data: updatedMatch });
    }
}));
