const Docker = require('dockerode');
const { PrismaClient } = require('@prisma/client');

const docker = new Docker();
const prisma = new PrismaClient();

// Instance management with Docker containers
const spawnInstance = async (instance) => {
  try {
    const containerName = `spx-instance-${instance.id}`;
    
    // Check if container already exists
    try {
      const existingContainer = docker.getContainer(containerName);
      await existingContainer.inspect();
      console.log(`Container ${containerName} already exists`);
      return;
    } catch (error) {
      // Container doesn't exist, continue with creation
    }

    // Create container for SPX-GC instance
    const container = await docker.createContainer({
      name: containerName,
      Image: 'spx-gc:latest', // Your SPX-GC Docker image
      Env: [
        `NODE_ENV=production`,
        `PORT=${instance.port}`,
        `INSTANCE_ID=${instance.id}`,
        `USER_ID=${instance.userId}`,
        `ORGANIZATION_ID=${instance.organizationId}`
      ],
      ExposedPorts: {
        [`${instance.port}/tcp`]: {}
      },
      HostConfig: {
        PortBindings: {
          [`${instance.port}/tcp`]: [{ HostPort: instance.port.toString() }]
        },
        Binds: [
          `spx_data_${instance.id}:/app/DATAROOT`,
          `spx_assets_${instance.id}:/app/ASSETS`
        ],
        RestartPolicy: {
          Name: 'unless-stopped'
        },
        Memory: 512 * 1024 * 1024, // 512MB limit
        CpuShares: 512
      },
      Labels: {
        'spx.instance.id': instance.id,
        'spx.user.id': instance.userId,
        'spx.organization.id': instance.organizationId
      }
    });

    // Start the container
    await container.start();

    console.log(`SPX-GC instance ${instance.id} started on port ${instance.port}`);
    
    return container;
  } catch (error) {
    console.error(`Error spawning instance ${instance.id}:`, error);
    throw error;
  }
};

// Stop an instance
const stopInstance = async (instanceId) => {
  try {
    const containerName = `spx-instance-${instanceId}`;
    const container = docker.getContainer(containerName);
    
    // Stop the container
    await container.stop({ t: 30 }); // 30 second timeout
    
    // Remove the container
    await container.remove();
    
    console.log(`SPX-GC instance ${instanceId} stopped and removed`);
  } catch (error) {
    console.error(`Error stopping instance ${instanceId}:`, error);
    throw error;
  }
};

// Get instance status
const getInstanceStatus = async (instanceId) => {
  try {
    const containerName = `spx-instance-${instanceId}`;
    const container = docker.getContainer(containerName);
    
    const info = await container.inspect();
    return info.State.Status; // running, stopped, etc.
  } catch (error) {
    console.error(`Error getting status for instance ${instanceId}:`, error);
    return 'not_found';
  }
};

// Get instance logs
const getInstanceLogs = async (instanceId, options = {}) => {
  try {
    const containerName = `spx-instance-${instanceId}`;
    const container = docker.getContainer(containerName);
    
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail: options.tail || 100,
      ...options
    });
    
    return logs.toString('utf8');
  } catch (error) {
    console.error(`Error getting logs for instance ${instanceId}:`, error);
    return '';
  }
};

// Get instance metrics
const getInstanceMetrics = async (instanceId) => {
  try {
    const containerName = `spx-instance-${instanceId}`;
    const container = docker.getContainer(containerName);
    
    const stats = await container.stats({ stream: false });
    
    // Calculate CPU usage
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const cpuUsage = (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100;
    
    // Calculate memory usage
    const memoryUsage = (stats.memory_stats.usage / stats.memory_stats.limit) * 100;
    
    return {
      cpu: Math.round(cpuUsage * 100) / 100,
      memory: Math.round(memoryUsage * 100) / 100,
      network: {
        rx: stats.networks?.eth0?.rx_bytes || 0,
        tx: stats.networks?.eth0?.tx_bytes || 0
      }
    };
  } catch (error) {
    console.error(`Error getting metrics for instance ${instanceId}:`, error);
    return {
      cpu: 0,
      memory: 0,
      network: { rx: 0, tx: 0 }
    };
  }
};

// List all running instances
const listRunningInstances = async () => {
  try {
    const containers = await docker.listContainers({
      filters: {
        label: ['spx.instance.id']
      }
    });
    
    return containers.map(container => ({
      id: container.Labels['spx.instance.id'],
      userId: container.Labels['spx.user.id'],
      organizationId: container.Labels['spx.organization.id'],
      status: container.State,
      ports: container.Ports
    }));
  } catch (error) {
    console.error('Error listing running instances:', error);
    return [];
  }
};

// Clean up stopped instances
const cleanupStoppedInstances = async () => {
  try {
    const containers = await docker.listContainers({
      all: true,
      filters: {
        label: ['spx.instance.id'],
        status: ['exited', 'dead']
      }
    });
    
    for (const containerInfo of containers) {
      try {
        const container = docker.getContainer(containerInfo.Id);
        await container.remove();
        console.log(`Cleaned up stopped container: ${containerInfo.Names[0]}`);
      } catch (error) {
        console.error(`Error cleaning up container ${containerInfo.Id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error cleaning up stopped instances:', error);
  }
};

// Health check for all instances
const healthCheckInstances = async () => {
  try {
    const instances = await prisma.instance.findMany({
      where: { status: 'RUNNING' }
    });
    
    for (const instance of instances) {
      try {
        const status = await getInstanceStatus(instance.id);
        
        if (status !== 'running') {
          // Update database status
          await prisma.instance.update({
            where: { id: instance.id },
            data: { status: 'ERROR' }
          });
          
          console.log(`Instance ${instance.id} is not running, status: ${status}`);
        }
      } catch (error) {
        console.error(`Error checking health of instance ${instance.id}:`, error);
        
        // Update database status
        await prisma.instance.update({
          where: { id: instance.id },
          data: { status: 'ERROR' }
        });
      }
    }
  } catch (error) {
    console.error('Error during health check:', error);
  }
};

// Scale instance resources
const scaleInstance = async (instanceId, resources) => {
  try {
    const containerName = `spx-instance-${instanceId}`;
    const container = docker.getContainer(containerName);
    
    // Update container resources
    await container.update({
      Memory: resources.memory || 512 * 1024 * 1024,
      CpuShares: resources.cpuShares || 512,
      MemorySwap: resources.memorySwap || -1
    });
    
    console.log(`Scaled instance ${instanceId} with resources:`, resources);
  } catch (error) {
    console.error(`Error scaling instance ${instanceId}:`, error);
    throw error;
  }
};

// Backup instance data
const backupInstance = async (instanceId) => {
  try {
    const containerName = `spx-instance-${instanceId}`;
    const container = docker.getContainer(containerName);
    
    // Create backup container
    const backupContainer = await docker.createContainer({
      name: `backup-${containerName}-${Date.now()}`,
      Image: 'alpine:latest',
      Cmd: ['tar', 'czf', '/backup/data.tar.gz', '-C', '/data', '.'],
      Volumes: {
        '/backup': {},
        '/data': {}
      },
      HostConfig: {
        Binds: [
          `backup_${instanceId}:/backup`,
          `spx_data_${instanceId}:/data`
        ]
      }
    });
    
    await backupContainer.start();
    await backupContainer.wait();
    await backupContainer.remove();
    
    console.log(`Backup created for instance ${instanceId}`);
  } catch (error) {
    console.error(`Error backing up instance ${instanceId}:`, error);
    throw error;
  }
};

module.exports = {
  spawnInstance,
  stopInstance,
  getInstanceStatus,
  getInstanceLogs,
  getInstanceMetrics,
  listRunningInstances,
  cleanupStoppedInstances,
  healthCheckInstances,
  scaleInstance,
  backupInstance
}; 