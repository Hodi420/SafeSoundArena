import { ApolloClient, InMemoryCache, split, HttpLink } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';
const httpLink = new HttpLink({
  uri: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/graphql`,
});
const wsLink = new GraphQLWsLink(
  createClient({
    url: `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3002'}/graphql`,
  }),
);
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
  },
  wsLink,
  httpLink,
);
export const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});
