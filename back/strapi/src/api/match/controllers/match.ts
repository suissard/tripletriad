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
    },

    async addLog(ctx) {
        const { uuid } = ctx.params;
        const { action } = ctx.request.body;
        const user = ctx.state.user;

        if (!user) {
            return ctx.unauthorized('You must be logged in to add a log');
        }

        const match = await strapi.db.query('api::match.match').findOne({
            where: { uuid: uuid },
            populate: ['users']
        });

        if (!match) {
            return ctx.notFound('Match not found');
        }

        const isUserInMatch = match.users?.some((u: any) => u.id === user.id);
        if (!isUserInMatch) {
            return ctx.forbidden('User is not part of this match');
        }

        const newLogEntry = {
            userId: user.id,
            action: action,
            timestamp: new Date().toISOString()
        };

        const currentLogs = match.logs || [];
        currentLogs.push(newLogEntry);

        const updatedMatch = await strapi.db.query('api::match.match').update({
            where: { id: match.id },
            data: { logs: currentLogs }
        });

        return ctx.send({ data: updatedMatch });
    }
}));
