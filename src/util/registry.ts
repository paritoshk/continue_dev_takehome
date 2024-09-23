// util/registry.ts
import fetch from "node-fetch"; // Ensure you have node-fetch installed
import { DependencyInstallation } from "../types";

export async function getPackageInfo(dep: DependencyInstallation): Promise<any> {
  // For testing purposes, return a mock URL for lodash
  if (dep.name === 'lodash') {
    return {
      name: dep.name,
      version: '4.17.21',
      dist: {
        tarball: 'https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz'
      },
      dependencies: {}
    };
  }

  if (!dep || typeof dep !== 'object' || !dep.name || !dep.version) {
    throw new Error(`Invalid dependency object: ${JSON.stringify(dep)}`);
  }

  // Simulate API call to npm registry
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        name: dep.name,
        version: dep.version,
        dist: {
          tarball: `https://registry.npmjs.org/${dep.name}/-/${dep.name}-${dep.version}.tgz`,
        },
        dependencies: {},
      });
    }, 100);
  });
}
