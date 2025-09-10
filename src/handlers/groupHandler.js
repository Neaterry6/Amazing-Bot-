const logger = require('../utils/logger');

class GroupHandler {
    constructor() {
        this.groupStats = new Map();
    }

    async handleParticipantsUpdate(sock, groupUpdate) {
        try {
            const { id, participants, action } = groupUpdate;
            
            for (const participant of participants) {
                logger.debug(`Group ${id}: ${participant} ${action}`);
                
                if (action === 'add') {
                    await this.handleMemberJoin(sock, id, participant);
                } else if (action === 'remove') {
                    await this.handleMemberLeave(sock, id, participant);
                } else if (action === 'promote') {
                    await this.handleMemberPromote(sock, id, participant);
                } else if (action === 'demote') {
                    await this.handleMemberDemote(sock, id, participant);
                }
            }
        } catch (error) {
            logger.error('Error handling participants update:', error);
        }
    }

    async handleGroupUpdate(sock, groupsUpdate) {
        try {
            for (const group of groupsUpdate) {
                logger.debug(`Group updated: ${group.id}`, group);
                
                if (group.subject) {
                    logger.info(`Group ${group.id} name changed to: ${group.subject}`);
                }
                
                if (group.desc) {
                    logger.info(`Group ${group.id} description updated`);
                }
            }
        } catch (error) {
            logger.error('Error handling group update:', error);
        }
    }

    async handleMemberJoin(sock, groupId, participant) {
        try {
            logger.info(`New member joined ${groupId}: ${participant}`);
        } catch (error) {
            logger.error('Error handling member join:', error);
        }
    }

    async handleMemberLeave(sock, groupId, participant) {
        try {
            logger.info(`Member left ${groupId}: ${participant}`);
        } catch (error) {
            logger.error('Error handling member leave:', error);
        }
    }

    async handleMemberPromote(sock, groupId, participant) {
        try {
            logger.info(`Member promoted in ${groupId}: ${participant}`);
        } catch (error) {
            logger.error('Error handling member promote:', error);
        }
    }

    async handleMemberDemote(sock, groupId, participant) {
        try {
            logger.info(`Member demoted in ${groupId}: ${participant}`);
        } catch (error) {
            logger.error('Error handling member demote:', error);
        }
    }

    getGroupStats() {
        return {
            totalGroups: this.groupStats.size,
            updates: Array.from(this.groupStats.values()).reduce((acc, stats) => acc + stats.updates, 0),
            joins: Array.from(this.groupStats.values()).reduce((acc, stats) => acc + stats.joins, 0),
            leaves: Array.from(this.groupStats.values()).reduce((acc, stats) => acc + stats.leaves, 0)
        };
    }
}

module.exports = new GroupHandler();