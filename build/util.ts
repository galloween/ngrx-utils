import * as fs from 'fs';
import * as cp from 'child_process';
import * as glob from 'glob';
import * as fsExtra from 'fs-extra';
import * as path from 'path';
import * as del from 'del';
import { Config } from './config';

export type RunnerFn = (config: Config) => Promise<any>;
export type TaskDef = [string, RunnerFn];
export type BaseFn = (command: string) => string;

export function copy(target: string, destination: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fsExtra.copy(target, path.resolve(destination), err => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export function remove(target: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fsExtra.remove(target, err => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export function writeFile(target: string, contents: string) {
  return new Promise((resolve, reject) => {
    fs.writeFile(target, contents, err => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export function readFile(target: string) {
  return fsExtra.readFile(target).then(v => v.toString());
}

export function getListOfFiles(globPath: string, exclude?: string | string[]): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const options = exclude ? { ignore: exclude } : {};

    glob(globPath, options, (error, matches) => {
      if (error) {
        return reject(error);
      }

      resolve(matches);
    });
  });
}

export function removeRecursively(...globs: string[]) {
  return del(globs);
}

export function exec(command: string, args: string[], base: BaseFn = fromNpm): Promise<string> {
  return new Promise((resolve, reject) => {
    cp.exec(base(command) + ' ' + args.join(' '), (err, stdout) => {
      if (err) {
        return reject(err);
      }

      resolve(stdout.toString());
    });
  });
}

export function cmd(command: string, args: string[]): Promise<string> {
  return exec(command, args, (command: string) => command);
}

export function git(args: string[]): Promise<string> {
  return cmd('git', args);
}

export function ignoreErrors<T>(promise: Promise<T>): Promise<T | null> {
  return promise.catch(() => null);
}

export function fromNpm(command: string) {
  return baseDir(`./node_modules/.bin/${command}`);
}

export function getPackageFilePath(pkg: string, filename: string) {
  return baseDir(`./modules/${pkg}/${filename}`);
}

const sorcery = require('sorcery');
export async function mapSources(file: string) {
  const chain = await sorcery.load(file);
  chain.write();
}

const ora = require('ora');
async function runTask(name: string, taskFn: () => Promise<any>) {
  const spinner = ora(name);

  try {
    spinner.start();

    await taskFn();

    spinner.succeed();
  } catch (e) {
    spinner.fail();

    throw e;
  }
}

export function createBuilder(tasks: TaskDef[]) {
  return async function(config: Config) {
    for (let [name, runner] of tasks) {
      await runTask(name, () => runner(config));
    }
  };
}

export function flatMap<K, J>(list: K[], mapFn: (item: K) => J[]): J[] {
  return list.reduce(
    function(newList, nextItem) {
      return [...newList, ...mapFn(nextItem)];
    },
    [] as J[]
  );
}

export function getTopLevelPackages(config: Config) {
  return config.packages.map(packageDescription => packageDescription.name);
}

export function getTestingPackages(config: Config) {
  return flatMap(config.packages, ({ name, hasTestingModule }) => {
    if (hasTestingModule) {
      return [`${name}/testing`];
    }

    return [];
  });
}

export function getAllPackages(config: Config) {
  return flatMap(config.packages, ({ name, hasTestingModule }) => {
    if (hasTestingModule) {
      return [name, `${name}/testing`];
    }

    return [name];
  });
}

export function getDestinationName(packageName: string) {
  return packageName.replace('/testing', '-testing');
}

export function getTopLevelName(packageName: string) {
  return packageName.replace('/testing', '');
}

export function getBottomLevelName(packageName: string) {
  return packageName.includes('/testing') ? 'testing' : packageName;
}

export function baseDir(...dirs: string[]): string {
  return `"${path.resolve(__dirname, '../', ...dirs)}"`;
}

export function shouldBundle(config: Config, packageName: string) {
  const pkg = config.packages.find(pkg => pkg.name === packageName);

  return pkg ? pkg.bundle : false;
}
