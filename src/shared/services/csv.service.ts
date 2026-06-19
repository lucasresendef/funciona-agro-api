import { Readable } from 'node:stream';

export type CsvExportMode = 'current' | 'filtered' | 'all';

export type CsvValue = string | number | boolean | Date | null | undefined;

export type CsvColumn<T> = {
  header: string;
  value: keyof T | ((row: T) => CsvValue);
};

export interface CsvStreamParams<T> {
  screen: string;
  mode: CsvExportMode;
  source: AsyncIterable<T> | Iterable<T>;
  columns: ReadonlyArray<CsvColumn<T>>;
  filename?: string;
}

export interface CsvStreamResult {
  stream: Readable;
  filename: string;
}

function formatCsvValue(value: CsvValue, dateTimeFormatter: Intl.DateTimeFormat): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return dateTimeFormatter.format(value);
  }

  return String(value);
}

function escapeCsv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export class CsvService {
  generateStream<T>({ screen, mode, source, columns, filename }: CsvStreamParams<T>): CsvStreamResult {
    const safeFilename = filename ?? `${screen}-${mode}.csv`;
    const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });

    const stream = Readable.from(
      (async function* () {
        yield `${columns.map((col) => escapeCsv(col.header)).join(';')}\n`;

        for await (const row of source) {
          const line = columns
            .map((col) => {
              const rawValue =
                typeof col.value === 'function'
                  ? col.value(row)
                  : (row as Record<string, unknown>)[String(col.value)];
              return escapeCsv(formatCsvValue(rawValue as CsvValue, dateTimeFormatter));
            })
            .join(';');
          yield `${line}\n`;
        }
      })(),
    );

    return {
      stream,
      filename: safeFilename,
    };
  }
}
