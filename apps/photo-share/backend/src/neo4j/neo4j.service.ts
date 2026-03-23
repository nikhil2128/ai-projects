import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import neo4j, { Driver, Session, ManagedTransaction } from 'neo4j-driver';

@Injectable()
export class Neo4jService implements OnModuleInit, OnModuleDestroy {
  private driver!: Driver;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const uri = this.configService.get<string>('NEO4J_URI', 'bolt://localhost:7687');
    const user = this.configService.get<string>('NEO4J_USER', 'neo4j');
    const password = this.configService.get<string>('NEO4J_PASSWORD', 'password');

    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
    await this.driver.verifyConnectivity();
  }

  async onModuleDestroy() {
    await this.driver.close();
  }

  getSession(): Session {
    return this.driver.session();
  }

  async read<T>(work: (tx: ManagedTransaction) => Promise<T>): Promise<T> {
    const session = this.getSession();
    try {
      return await session.executeRead(work);
    } finally {
      await session.close();
    }
  }

  async write<T>(work: (tx: ManagedTransaction) => Promise<T>): Promise<T> {
    const session = this.getSession();
    try {
      return await session.executeWrite(work);
    } finally {
      await session.close();
    }
  }
}
