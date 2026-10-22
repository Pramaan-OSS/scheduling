import { buildNonDelegationCredentials } from "@scheduling/lib/delegationCredential";
import { prisma } from "@scheduling/prisma";
import type { Prisma } from "@scheduling/prisma/client";  
import type { AppCategories } from "@scheduling/prisma/client";
import { credentialForCalendarServiceSelect } from "@scheduling/prisma/selects/credential";

export class PrismaCredentialRepository {
    constructor(private readonly prismaClient: typeof prisma){}

    async findNonDelegationCredentialsByAppCategories({
        idToSearchObject,  
        appCategories,
    }: {
        idToSearchObject: Prisma.CredentialWhereInput;  
        appCategories: AppCategories[];  
    }){

        const credentials = await this.prismaClient.credential.findMany({
            where: {
                ...idToSearchObject,
                app: {
                    categories: {
                        hasSome: appCategories
                    }
                }
            },
            select: {
                ...credentialForCalendarServiceSelect,
                team: {
                    select: {
                        name: true
                    }
                }
            }
        })


        return buildNonDelegationCredentials(credentials)
    }
}