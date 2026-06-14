/**
 * FlowPilot Elite FlowScript API Definitions
 * (C) 2026 FlowPilot Systems
 */

/** High-level browser automation commands */
declare interface FlowEngine {
  /** Performs a click on the element matching the selector. Returns true if successful. */
  click(selector: string): Promise<boolean>;
  /** Fills an input field with the specified value. Returns true if successful. */
  fill(selector: string, value: string): Promise<boolean>;
  /** Elite-style filling of an input field. Returns true if successful. */
  FillWith(selector: string, value: string): Promise<boolean>;
  /** Pauses execution for the specified duration in milliseconds. */
  wait(ms: number): Promise<void>;
  /** Scans the current page for interactive nodes and returns them. */
  scan(): Promise<any[]>;
  /** Logs a message to the FlowPilot sidepanel debug console. */
  log(message: any): void;
  /** Waits for an element to appear or be interactive. Times out after 15s by default. */
  waitFor(selector: string, timeout?: number): Promise<boolean>;
  /** Displays a native alert dialog on the target page. */
  alert(message: any): Promise<void>;

  /* Capitalized Aliases */
  Click(selector: string): Promise<boolean>;
  Fill(selector: string, value: string): Promise<boolean>;
  Wait(ms: number): Promise<void>;
  Scan(): Promise<any[]>;
  Log(message: any): void;
  WaitFor(selector: string, timeout?: number): Promise<boolean>;
}

/** Access to the Current Table Context */
declare interface FlowTable<T = Record<string, any>> {
  /** Iterates over column headers of the current table. */
  columns(cb: (header: string, index: number) => void): void;
  /** Returns all column headers as an array. */
  getHeaders(): string[];
  /** Adds a new row to the current table. */
  add(rowData: T | Record<string, any>): Promise<boolean>;
  /** Updates a specific row in the current table by index. */
  update(index: number, rowData: Partial<T> | Record<string, any>): Promise<boolean>;
  /** Deletes a specific row from the current table by index. */
  delete(index: number): Promise<boolean>;
  /** Retrieves all rows from the current table. */
  getAll(): Promise<T[]>;
  /** Finds a single row matching the criteria. */
  find(cb: (row: T) => boolean): Promise<T | undefined>;
  /** Iterates over all rows asynchronously. */
  forEach(cb: (row: T, index: number) => Promise<void> | void): Promise<void>;
}

/** Base interface for all Global Vault items */
declare interface GlobalCollection<T = any> {
  /** Adds a new row or merges data into the variable. */
  add(rowData: T | Record<string, any>): Promise<boolean>;
  /** Updates a specific entry or property. */
  update(index: number, rowData: Partial<T> | Record<string, any>): Promise<boolean>;
  update(data?: Partial<T> | Record<string, any>): Promise<boolean>;
  update(key: string, value: any): Promise<boolean>;
  /** Deletes an entry by index. */
  delete(index: number): Promise<boolean>;
  /** Retrieves all data items as an array. */
  getAll(): Promise<T[]>;
  /** Finds a specific item matching a criteria. */
  find(cb: (row: T) => boolean): Promise<T | undefined>;
  /** Iterates over all items asynchronously. */
  forEach(cb: (row: T, index: number) => Promise<void> | void): Promise<void>;
}

/** Global Variable Object (PERSISTENT across runs) */
declare interface GlobalVariable<T = any> extends GlobalCollection<T> {}

/** Global Dataset (Shared between sequences) */
declare interface GlobalDataset<T = any> extends GlobalCollection<T> {}

/** Displays a native alert dialog on the page. */
declare function alert(message: any): Promise<void>;

/** Logs a message to the FlowPilot sidepanel debug console. */
declare function log(message: any): void;
