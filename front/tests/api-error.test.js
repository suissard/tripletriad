import { describe, it, expect } from 'vitest';
import { getApiErrorMessage } from '../src/utils/apiError.js';

const strapiError = (message) => Object.assign(new Error('Request failed with status code 400'), {
  data: { error: { message } },
});

describe('getApiErrorMessage', () => {
  it('traduit les messages Strapi connus (payload normalisé)', () => {
    expect(getApiErrorMessage(strapiError('You cannot send a friend request to yourself.'), 'x'))
      .toBe('Vous ne pouvez pas vous ajouter vous-même.');
    expect(getApiErrorMessage(strapiError('User not found.'), 'x')).toBe('Joueur introuvable.');
  });

  it('conserve les valeurs dynamiques', () => {
    expect(getApiErrorMessage(strapiError('Cannot send a new request yet. Please wait 5 hours.'), 'x'))
      .toBe('Nouvelle demande possible dans 5 h.');
    expect(getApiErrorMessage(new Error('Not enough gems to buy this frame. Cost: 3 gems.'), 'x'))
      .toBe('Pas assez de gemmes.');
  });

  it('retombe sur le message par défaut pour une erreur inconnue ou réseau', () => {
    expect(getApiErrorMessage(new Error('Request failed with status code 500'), 'Erreur réseau'))
      .toBe('Erreur réseau');
    expect(getApiErrorMessage(undefined, 'Erreur réseau')).toBe('Erreur réseau');
  });
});
