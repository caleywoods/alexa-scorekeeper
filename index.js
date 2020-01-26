// This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
// Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
// session persistence, api calls, and more.
const Alexa = require('ask-sdk-core');

// Since we're using an Alexa end-to-end hosted skill, use an S3 bucket for persistence
const persistenceAdapter = require('ask-sdk-s3-persistence-adapter');

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'Welcome to the score keeper skill. For help, say "help"';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

const NewGameIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'NewGameIntent';
    },
    async handle(handlerInput) {
        const speakOutput = 'A new game was started. The teams are, white and orange.';
        const { attributesManager } = handlerInput;
        const attributes = {
            'goalScore': 0,
            'mustWinByTwo': false,
            'score': {'white': 0, 'orange': 0}
        };

        attributesManager.setPersistentAttributes(attributes);
        await attributesManager.savePersistentAttributes();

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

const AddScoreIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AddScoreIntent';
    },
    async handle(handlerInput) {
        const { attributesManager } = handlerInput;
        const request = handlerInput.requestEnvelope.request;
        const attributes = await attributesManager.getPersistentAttributes();
        const team = request.intent.slots && request.intent.slots.team.value;
        const goalScore = attributes.goalScore;
        const goalScoreIsSet = goalScore > 0;
        const mustWinByTwo = attributes.mustWinByTwo;
        let numberOfPointsScored = request.intent.slots && request.intent.slots.num_points.value;
        numberOfPointsScored = Number(numberOfPointsScored);

        if (isNaN(numberOfPointsScored)) {
            const errorMessage = 'I\'m sorry, I couldn\'t add the points. Try again.';
            return handlerInput.responseBuilder
                .speak(errorMessage)
                .getResponse();
        }

        if (!attributes.score) {
            return handlerInput.responseBuilder
                .speak('Unable to find game in progress.')
                .getResponse();
        }

        let currentTeamScore = attributes.score[team];
        currentTeamScore += numberOfPointsScored;
        attributes.score[team] = currentTeamScore;

        let goalScoreIsMet = currentTeamScore >= goalScore;
        let winCondition = goalScoreIsSet && goalScoreIsMet;

        if (mustWinByTwo) {
            const oppositeTeam = team === 'white' ? 'orange' : 'white';
            const oppositeTeamScore = Number(attributes.score[oppositeTeam]);
            const aheadByTwoOrMore = currentTeamScore - oppositeTeamScore > 1;
            winCondition = winCondition && aheadByTwoOrMore;
        }

        if (winCondition) {
            let winSpeech = `${team} has reached ${goalScore}, game over.`;

            if (mustWinByTwo) {
                winSpeech = `${team} has reached ${currentTeamScore} and satisfied the "win by two or more" rule, game over.`;
            }
            return handlerInput.responseBuilder
                .speak(winSpeech)
                .getResponse();
        }

        let spokenPointForm;
        if (currentTeamScore === 0) {
            spokenPointForm = 'points';
        } else {
            spokenPointForm = currentTeamScore > 1 ? 'points' : 'point';
        }

        attributesManager.setPersistentAttributes(attributes);
        await attributesManager.savePersistentAttributes();

        let speakOutput = `${team} now has ${currentTeamScore} ${spokenPointForm}.`;

        if (goalScoreIsMet && mustWinByTwo) {
            speakOutput = `${team} has reached ${goalScore} but they must win by two or more.`;
        }
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

const SubtractScoreIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SubtractScoreIntent';
    },
    async handle(handlerInput) {
        const { attributesManager } = handlerInput;
        const request = handlerInput.requestEnvelope.request;
        const attributes = await attributesManager.getPersistentAttributes();
        const team = request.intent.slots && request.intent.slots.team.value;
        let numberOfPointsToRemove = request.intent.slots && request.intent.slots.num_points.value;
        numberOfPointsToRemove = Number(numberOfPointsToRemove);

        if (isNaN(numberOfPointsToRemove)) {
            const errorMessage = "I'm sorry, I couldn't remove the points. Please try again.";
            return handlerInput.responseBuilder
                .speak(errorMessage)
                .getResponse();
        }

        let currentTeamScore = attributes.score[team];
        currentTeamScore -= numberOfPointsToRemove;
        attributes.score[team] = currentTeamScore;

        let spokenPointForm;
        if (currentTeamScore === 0) {
            spokenPointForm = 'points';
        } else {
            spokenPointForm = currentTeamScore > 1 ? 'points' : 'point';
        }

        attributesManager.setPersistentAttributes(attributes);
        await attributesManager.savePersistentAttributes();

        const speakOutput = `${team} now has ${currentTeamScore} ${spokenPointForm}.`;
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

const SetScoreIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SetScoreIntent';
    },
    async handle(handlerInput) {
        const { attributesManager } = handlerInput;
        const request = handlerInput.requestEnvelope.request;
        const attributes = await attributesManager.getPersistentAttributes();
        const team = request.intent.slots && request.intent.slots.team.value;
        let numberOfPoints = request.intent.slots && request.intent.slots.num_points.value;
        numberOfPoints = Number(numberOfPoints);

        if (isNaN(numberOfPoints)) {
            const errorMessage = "I'm sorry, the points could not be set. Please try again.";
            return handlerInput.responseBuilder
                .speak(errorMessage)
                .getResponse();
        }

        const currentTeamScore = numberOfPoints;
        attributes.score[team] = currentTeamScore;

        let spokenPointForm;
        if (currentTeamScore === 0) {
            spokenPointForm = 'points';
        } else {
            spokenPointForm = currentTeamScore > 1 ? 'points' : 'point';
        }

        attributesManager.setPersistentAttributes(attributes);
        await attributesManager.savePersistentAttributes();

        const speakOutput = `${team} score set to ${currentTeamScore} ${spokenPointForm}.`;
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

const SetGoalScoreIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SetGoalScoreIntent';
    },
    async handle(handlerInput) {
        const { attributesManager } = handlerInput;
        const request = handlerInput.requestEnvelope.request;
        const attributes = await attributesManager.getPersistentAttributes();
        let goalScore = request.intent.slots && request.intent.slots.goal_score.value;

        goalScore = Number(goalScore);

        if (isNaN(goalScore)) {
            const errorMessage = "I'm sorry, I couldn't set the goal score. Please try again.";
            return handlerInput.responseBuilder
                .speak(errorMessage)
                .getResponse();
        }

        attributes.goalScore = goalScore;

        let spokenPointForm;
        if (goalScore === 0) {
            spokenPointForm = 'points';
        } else {
            spokenPointForm = goalScore > 1 ? 'points' : 'point';
        }

        attributesManager.setPersistentAttributes(attributes);
        await attributesManager.savePersistentAttributes();

        const speakOutput = `Goal score set to ${goalScore} ${spokenPointForm}.`;
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

const SetWinByTwoRuleIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SetWinByTwoRuleIntent';
    },
    async handle(handlerInput) {
        const { attributesManager } = handlerInput;
        const attributes = await attributesManager.getPersistentAttributes();
        attributes.mustWinByTwo = true;

        attributesManager.setPersistentAttributes(attributes);
        await attributesManager.savePersistentAttributes();

        const speakOutput = 'The "must win by two" rule has been enabled.';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

const CheckScoreIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CheckScoreIntent';
    },
    async handle(handlerInput) {
        const { attributesManager } = handlerInput;
        const attributes = await attributesManager.getPersistentAttributes() || {};
        const whiteTeamScore = attributes.score.white || 0;
        const orangeTeamScore = attributes.score.orange || 0;

        const whiteTeamAhead = whiteTeamScore > orangeTeamScore;
        if (whiteTeamAhead) {
            const scoreSpeech = `White is winning, ${whiteTeamScore} to ${orangeTeamScore}.`;
            return handlerInput.responseBuilder
                .speak(scoreSpeech)
                .getResponse();
        }

        const orangeTeamAhead = orangeTeamScore > whiteTeamScore;
        if (orangeTeamAhead) {
            const scoreSpeech = `Orange is winning, ${orangeTeamScore} to ${whiteTeamScore}.`;
            return handlerInput.responseBuilder
                .speak(scoreSpeech)
                .getResponse();
        }

        const scoresAreTied = whiteTeamScore === orangeTeamScore;
        if (scoresAreTied) {
            let scoreSpeech;
            const scorelessGame = scoresAreTied && whiteTeamScore === 0;
            if (scorelessGame) {
                scoreSpeech = `Neither team has scored yet. How pitiful.`;
                return handlerInput.responseBuilder
                    .speak(scoreSpeech)
                    .getResponse();
            } else {
                scoreSpeech = `The score is tied at ${whiteTeamScore}.`;
                return handlerInput.responseBuilder
                    .speak(scoreSpeech)
                    .getResponse();
            }
        }

        const speakOutput = `The current score is, white, ${whiteTeamScore}, orange, ${orangeTeamScore}.`;
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

const CheckGoalScoreIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CheckGoalScoreIntent';
    },
    async handle(handlerInput) {
        const { attributesManager } = handlerInput;
        const attributes = await attributesManager.getPersistentAttributes() || {};
        const goalScore = attributes.goalScore;
        const goalScoreIsSet = goalScore > 0;

        if (goalScoreIsSet) {
            const speech = `When a team reaches ${goalScore} they win.`;
            return handlerInput.responseBuilder
                .speak(speech)
                .getResponse();
        } else {
            const speech = 'A goal score is not set.';
            return handlerInput.responseBuilder
                .speak(speech)
                .getResponse();
        }
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can ask me to start a new game by saying "start a new game".';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Peace out!';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse();
    }
};

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.stack}`);
        const speakOutput = `Sorry, I had trouble doing what you asked. Please try again.`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        NewGameIntentHandler,
        AddScoreIntentHandler,
        SubtractScoreIntentHandler,
        SetScoreIntentHandler,
        SetGoalScoreIntentHandler,
        SetWinByTwoRuleIntentHandler,
        CheckScoreIntentHandler,
        CheckGoalScoreIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler, // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    )
    .addErrorHandlers(
        ErrorHandler,
    )
    .withPersistenceAdapter(
        new persistenceAdapter.S3PersistenceAdapter({bucketName:process.env.S3_PERSISTENCE_BUCKET})
    )
    .lambda();