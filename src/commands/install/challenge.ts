import { InstallationPlan, DependencyInstallation } from "../../types";
import { getPackageInfo } from "../../util/registry";
import semver from "semver";

interface DependencyTree {
  [key: string]: {
    version: string;
    dependencies: Record<string, string>;
  };
}

interface VersionRequirement {
  version: string;
  requiredBy: string[];
}

export async function constructInstallationPlan(
  topLevelDependencies: Record<string, string>
): Promise<InstallationPlan> {
  const dependencyTree: DependencyTree = {};
  const versionRequirements: Record<string, VersionRequirement[]> = {};
  const installationPlan: InstallationPlan = [];

  try {
    await resolveDependencies(topLevelDependencies, dependencyTree, versionRequirements);
  } catch (error) {
    console.error("Error resolving dependencies:", error);
    throw error;
  }

  // Add top-level dependencies first
  for (const [name, versionRange] of Object.entries(topLevelDependencies)) {
    const bestVersion = findBestVersion(versionRequirements[name] || []);
    if (!bestVersion) {
      throw new Error(`Unable to find suitable version for ${name}`);
    }
    installationPlan.push({
      name,
      version: bestVersion.version,
      parentDirectory: `.pnpm/${name}@${bestVersion.version}/node_modules/${name}`,
    });
  }

  // Add shared dependencies
  for (const [name, requirements] of Object.entries(versionRequirements)) {
    if (!(name in topLevelDependencies)) {
      const bestVersion = findBestVersion(requirements);
      if (!bestVersion) {
        throw new Error(`No valid version found for shared dependency: ${name}`);
      }
      installationPlan.push({
        name,
        version: bestVersion.version,
        parentDirectory: `.pnpm/${name}@${bestVersion.version}/node_modules/${name}`,
      });
    }
  }

  // Add nested dependencies if needed
  for (const [name, requirements] of Object.entries(versionRequirements)) {
    for (const req of requirements) {
      const bestVersion = findBestVersion(requirements);
      if (!bestVersion || req.version !== bestVersion.version) {
        for (const requiredBy of req.requiredBy) {
          if (!dependencyTree[requiredBy] || !dependencyTree[requiredBy].version) {
            throw new Error(`Invalid requiredBy dependency: ${requiredBy}`);
          }
          if (!req.version) {
            throw new Error(`Undefined version for nested dependency: ${name} required by ${requiredBy}`);
          }
          installationPlan.push({
            name,
            version: req.version,
            parentDirectory: `.pnpm/${requiredBy}@${dependencyTree[requiredBy].version}/node_modules/${name}`,
          });
        }
      }
    }
  }

  return installationPlan;
}

async function resolveDependencies(
  dependencies: Record<string, string>,
  tree: DependencyTree,
  versionReqs: Record<string, VersionRequirement[]>,
  path: string[] = []
): Promise<void> {
  for (const [name, versionRange] of Object.entries(dependencies)) {
    if (path.includes(name)) {
      console.warn(`Circular dependency detected: ${path.join(" -> ")} -> ${name}`);
      continue;
    }

    const packageInfo = await getPackageInfo({ name, version: versionRange, parentDirectory: '' });
    const version = packageInfo.version;

    if (!versionReqs[name]) {
      versionReqs[name] = [];
    }
    const existingReq = versionReqs[name].find(req => req.version === version);
    if (existingReq) {
      existingReq.requiredBy.push(path[path.length - 1] || "root");
    } else {
      versionReqs[name].push({ version, requiredBy: [path[path.length - 1] || "root"] });
    }

    if (!tree[name] || semver.gt(version, tree[name].version)) {
      tree[name] = { version, dependencies: packageInfo.dependencies || {} };
    }

    await resolveDependencies(
      tree[name].dependencies,
      tree,
      versionReqs,
      [...path, name]
    );
  }
}

function findBestVersion(requirements: VersionRequirement[]): VersionRequirement {
  return requirements.reduce((best, current) => {
    if (!best || (semver.gt(current.version, best.version) && current.requiredBy.length >= best.requiredBy.length)) {
      return current;
    }
    return best;
  });
}