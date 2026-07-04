interface NoSearchResultsProps {
  query: string;
}

export function NoSearchResults({ query }: NoSearchResultsProps) {
  return <p className="text-sm text-muted-foreground">No results match "{query}".</p>;
}
